<script lang="ts">
  import { getProject } from '$lib/stores/project.svelte';
  import { sanitizeExportName } from '$lib/utils/exportNames';
  let { elementId, name, hasLid = false, referenceVolume = false }: { elementId: string; name: string; hasLid?: boolean; referenceVolume?: boolean } = $props();
  let busy = $state(false);
  let error = $state('');
  let part = $state('all');
  $effect(() => { elementId; part = 'all'; error = ''; });

  async function download(format: 'stl' | '3mf') {
    busy = true; error = '';
    const exportId = elementId, exportName = name, exportPart = part;
    let worker: import('$lib/utils/geometryWorker').GeometryWorkerManager | undefined;
    try {
      const { GeometryWorkerManager } = await import('$lib/utils/geometryWorker');
      worker = new GeometryWorkerManager();
      // A dedicated worker keeps export independent of the scene's generation/cache.
      const snapshot = JSON.parse(JSON.stringify(getProject()));
      const result = await worker.generate(snapshot, '', '');
      result.selectedTrayGeometry.dispose();
      result.boxGeometry?.dispose(); result.lidGeometry?.dispose();
      for (const tray of result.allTrayGeometries) tray.geometry.dispose();
      for (const box of result.allBoxGeometries) {
        box.boxGeometry?.dispose(); box.lidGeometry?.dispose(); box.lidTextInlayGeometry?.dispose();
        for (const tray of box.trayGeometries) tray.geometry.dispose();
      }
      for (const tray of result.allLooseTrayGeometries) tray.geometry.dispose();
      let blob: Blob;
      let filename: string;
      const prefix = sanitizeExportName(exportName);
      if (format === '3mf') {
        const result = await worker.export3mf(exportId, exportPart);
        blob = new Blob([result.data]); filename = `${prefix}-${exportPart}.3mf`;
      } else {
        const files = await worker.exportAllStls(exportId, exportPart);
        if (!files.length) throw new Error('No printable parts found for this element.');
        if (files.length === 1) {
          blob = new Blob([files[0].data]); filename = files[0].filename;
        } else {
          const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js');
          const zip = new ZipWriter(new BlobWriter('application/zip'));
          for (const file of files) await zip.add(file.filename, new BlobReader(new Blob([file.data])));
          blob = await zip.close(); filename = `${prefix}-parts.zip`;
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { error = e instanceof Error ? e.message : String(e); }
    finally { worker?.terminate(); busy = false; }
  }
</script>

<section aria-label="Export selected element" class="elementExport">
  <h3>Export {name}</h3>
  {#if hasLid}
    <label>Parts
      <select bind:value={part} disabled={busy}>
        <option value="all">Rack + lid</option>
        <option value="body">Rack only</option>
        <option value="lid">Lid only</option>
      </select>
    </label>
  {/if}
  <div class="buttons">
    <button disabled={busy} onclick={() => download('stl')}>{busy ? 'Exporting…' : 'Export STL'}</button>
    <button disabled={busy} onclick={() => download('3mf')}>Export 3MF</button>
  </div>
  <p>{referenceVolume ? 'Exports the solid reference volume of this board.' : 'Only this element and its printable parts. Multiple STLs download as a ZIP.'}</p>
  {#if error}<p role="alert">{error}</p>{/if}
</section>

<style>
  .elementExport { padding: .75rem; border-top: 1px solid var(--border, #555); display: grid; gap: .5rem; flex-shrink: 0; max-height: 40vh; overflow-y: auto; }
  h3 { font-weight: 600; } p { font-size: .8rem; line-height: 1.5; } label { display: grid; gap: .4rem; }
  .buttons { display: flex; gap: .5rem; flex-wrap: wrap; }
  button, select { padding: .5rem .75rem; border: 1px solid var(--border, #777); border-radius: var(--radius-2); background: var(--bg, #222); color: var(--fg, #fff); }
  select { appearance: auto; } button:disabled { opacity: .5; } [role='alert'] { color: #e88b79; }
</style>

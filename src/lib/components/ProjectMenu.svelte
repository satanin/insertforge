<script lang="ts">
  import { createNewProject, getProject, importProject, saveProjectNow } from '$lib/stores/project.svelte';
  import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';
  import { sanitizeExportName } from '$lib/utils/exportNames';
  import type { ProjectType } from '$lib/types/project';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';

  let dialog: HTMLDialogElement;
  let fileInput: HTMLInputElement;
  let type = $state<ProjectType>('insert');
  let name = $state('');
  let error = $state('');
  const project = $derived(getProject());

  function open() {
    type = 'insert';
    name = '';
    error = '';
    dialog.showModal();
  }
  function download() {
    saveProjectNow();
    const url = URL.createObjectURL(new Blob([exportProjectToJson(project)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeExportName(project.name)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function load(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = importProjectFromJson(await file.text());
      if (!data) throw new Error('Invalid project JSON.');
      if (!window.confirm(`Open "${data.name}"? This will replace the current local project. Export it first if you want to keep it.`)) return;
      importProject(data);
      saveProjectNow();
      dialog.close();
    } catch {
      error = 'Could not open this project. Check that it is a valid InsertForge JSON file.';
    } finally {
      input.value = '';
    }
  }
</script>

<button class="projectMenuButton" onclick={open} title="Project menu">
  <span class="projectName">{project.name}</span>
  <span class="projectType">{project.projectType === 'shelf-storage' ? 'Shelf storage · Experimental' : 'Box insert'}</span>
  <span aria-hidden="true">▾</span>
</button>

<dialog bind:this={dialog} aria-labelledby="new-project-title">
  <form onsubmit={(e) => { e.preventDefault(); createNewProject(type, name); dialog.close(); }}>
    <header>
      <h2 id="new-project-title">New project</h2>
      <button type="button" aria-label="Close project menu" onclick={() => dialog.close()}>×</button>
    </header>
    <label class="nameField">Project name <input bind:value={name} placeholder="Optional" /></label>
    <fieldset>
      <legend><HelpRow>Project type<HelpTip label="About project types">Box inserts use layers inside a game box. Shelf storage will use assembled modules with removable drawers. The type is saved with the project; this creates a new project rather than converting the current one.</HelpTip></HelpRow></legend>
      <label class="typeOption" class:selected={type === 'insert'}>
        <input type="radio" name="projectType" value="insert" bind:group={type} />
        <span>Box insert <small>Default</small></span>
      </label>
      <label class="typeOption" class:selected={type === 'shelf-storage'}>
        <input type="radio" name="projectType" value="shelf-storage" bind:group={type} />
        <span>Shelf storage <small>Experimental</small></span>
      </label>
    </fieldset>
    {#if type === 'shelf-storage'}
      <p class="notice" role="status">Experimental card drawers with separate shell and drawer. Fit and load capacity require physical validation.</p>
    {/if}
    <p class="notice">Creating a project replaces the current local project. Export its JSON first if you want to keep it.</p>
    {#if error}<p role="alert">{error}</p>{/if}
    <div class="fileActions">
      <button type="button" onclick={download}>Export current JSON</button>
      <button type="button" onclick={() => fileInput.click()}>Open project JSON…</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" onchange={load} hidden />
    </div>
    <footer>
      <button type="button" onclick={() => dialog.close()}>Cancel</button>
      <button type="submit" class="primary">Create project</button>
    </footer>
  </form>
</dialog>

<style>
  button, input { font: inherit; }
  button { cursor: pointer; color: var(--fg); background: var(--contrastLow); border: var(--borderThin); border-radius: 0.35rem; padding: 0.45rem 0.65rem; }
  button:hover { background: var(--contrastMedium); }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--fgPrimary); outline-offset: 3px; }
  .projectMenuButton { display: flex; align-items: center; gap: 0.5rem; min-width: 0; font-size: 0.75rem; }
  .projectName { max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .projectType { color: var(--fgMuted); font-size: 0.7rem; }
  dialog { width: min(32rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow: auto; padding: 1.25rem; color: var(--fg); background: var(--bg); border: var(--borderThin); border-radius: 0.65rem; }
  dialog::backdrop { background: rgb(0 0 0 / 60%); }
  form { display: flex; flex-direction: column; gap: 1rem; }
  header, footer, .fileActions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  header { justify-content: space-between; }
  h2 { margin: 0; font-size: 1.15rem; }
  .nameField { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.875rem; }
  .nameField input { width: 100%; box-sizing: border-box; color: var(--fg); background: var(--inputBg); border: var(--borderThin); border-radius: 0.35rem; padding: 0.5rem; }
  fieldset { display: flex; flex-direction: column; gap: 0.5rem; border: 0; padding: 0; margin: 0; }
  legend { margin-bottom: 0.5rem; font-size: 0.875rem; }
  .typeOption { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem; border: var(--borderThin); border-radius: 0.45rem; cursor: pointer; }
  .typeOption.selected { border-color: var(--fgPrimary); background: var(--contrastLow); }
  small { margin-left: 0.4rem; color: var(--fgMuted); }
  .notice { margin: 0; font-size: 0.8rem; line-height: 1.5; color: var(--fgMuted); }
  footer { justify-content: flex-end; border-top: var(--borderThin); padding-top: 1rem; }
  .primary { border-color: var(--fgPrimary); }
  @media (max-width: 1100px) { .projectMenuButton { flex-wrap: wrap; gap: 0.2rem; } .projectName { max-width: 7rem; } }
  @media (max-width: 768px) { .projectName { display: none; } .projectType { max-width: 7rem; } }
</style>

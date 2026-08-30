<script lang="ts">
  import { Spacer, Text, Title } from '@tableslayer/ui';
  import { APP_NAME } from '$lib/appInfo';
  import { marked } from 'marked';
  import type { PageData } from './$types';

  let { data } = $props<{ data: PageData }>();

  marked.setOptions({
    breaks: true,
    gfm: true
  });
</script>

<svelte:head>
  <title>{APP_NAME} license</title>
  <meta name="description" content={`${APP_NAME} software license and copyright notice.`} />
</svelte:head>

<div class="licensePage">
  <div class="licenseContent">
    <Title as="h1" size="md">Software license</Title>
    <Spacer size="0.5rem" />
    <Text color="var(--fgMuted)">
      {APP_NAME} is distributed under the following license terms.
    </Text>
    <Spacer size="2rem" />
    <div class="licenseTerms">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html marked.parse(data.licenseText)}
    </div>
  </div>
</div>

<style>
  .licensePage {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .licenseContent {
    max-width: 672px;
    margin: 3rem auto;
    padding: 0 2rem;
  }

  .licenseTerms {
    line-height: 1.6;
  }

  .licenseTerms :global(h1),
  .licenseTerms :global(h2),
  .licenseTerms :global(h3) {
    margin-top: 2rem;
    margin-bottom: 0.75rem;
  }

  .licenseTerms :global(p),
  .licenseTerms :global(ol) {
    margin: 0.75rem 0;
  }

  .licenseTerms :global(a) {
    color: var(--fg);
  }

  @media (max-width: 768px) {
    .licenseContent {
      margin: 2rem auto;
      padding: 0 1rem;
    }
  }
</style>

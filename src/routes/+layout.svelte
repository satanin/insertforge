<script lang="ts">
  import './layout.css';
  import { dev } from '$app/environment';
  import { resolve } from '$app/paths';
  import { Link, IconButton, Icon, Popover, Toast } from '@tableslayer/ui';
  import { IconSun, IconMoon, IconMenu2 } from '@tabler/icons-svelte';
  import { APP_LINKS, APP_NAME, APP_VERSION } from '$lib/appInfo';
  import { ModeWatcher, toggleMode, mode } from 'mode-watcher';
  import { setContext } from 'svelte';

  let { children } = $props();

  // Set context for child components
  setContext('theme', {
    get mode() {
      return mode.current;
    },
    toggle: toggleMode
  });
</script>

<ModeWatcher defaultMode="dark" darkClassNames={['dark']} lightClassNames={['light']} />

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={dev ? '/favicon-dev.svg' : '/favicon.svg'} />
</svelte:head>

<div class="appContainer" class:dark={mode.current === 'dark'} class:light={mode.current === 'light'}>
  <!-- Header -->
  <div class="appHeader">
    <div class="headerBrand">
      <div class="headerBrand__line">
        <Link href={resolve('/')} color="fg">{APP_NAME}</Link>
        <span class="headerVersion">
          <Link href={APP_LINKS.changelog} color="muted">v{APP_VERSION}</Link>
        </span>
        <span>based on</span>
        <Link href={APP_LINKS.counterSlayerApp} target="_blank" rel="noopener noreferrer" color="fg">Counter Slayer</Link>
        <span>by</span>
        <Link href={APP_LINKS.daveSnider} target="_blank" rel="noopener noreferrer" color="fg">Dave Snider</Link>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <div class="headerLinks">
        <Link href={APP_LINKS.changelog} color="fg">InsertForge Changelog</Link>
      </div>
      <div class="headerMenu">
        <Popover positioning={{ placement: 'bottom-end' }}>
          {#snippet trigger()}
            <IconButton variant="ghost" size="sm">
              <Icon Icon={IconMenu2} />
            </IconButton>
          {/snippet}
          {#snippet content()}
            <div class="headerMenuContent">
              <Link href={APP_LINKS.changelog} color="fg">InsertForge Changelog</Link>
            </div>
          {/snippet}
        </Popover>
      </div>
      <IconButton variant="ghost" onclick={toggleMode} size="sm">
        <Icon Icon={mode.current === 'dark' ? IconSun : IconMoon} />
      </IconButton>
    </div>
  </div>

  <div class="appContent">
    {@render children()}
  </div>
  <Toast />
</div>

<style>
  .appContainer {
    --header-height: 2.5rem;
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: var(--bg);
    color: var(--fg);
  }

  .appHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: var(--borderThin);
    font-size: 0.875rem;
    color: var(--fgMuted);
    flex-shrink: 0;
  }

  .appContent {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .headerBrand {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .headerBrand__line {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: nowrap;
    min-width: 0;
    white-space: nowrap;
  }

  .headerVersion {
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .headerLinks {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .headerMenu {
    display: none;
  }

  .headerMenuContent {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .headerBrand {
      align-items: flex-start;
    }

    .headerBrand__line {
      flex-wrap: wrap;
      line-height: 1.3;
      white-space: normal;
    }

    .headerLinks {
      display: none;
    }

    .appHeader {
      gap: 0.75rem;
    }

    .headerMenu {
      display: block;
    }
  }
</style>

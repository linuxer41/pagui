import { invoke } from '@tauri-apps/api/core';
import type { BarConfig, SystemBarsConfig, SystemBarsState } from './types';

export type { BarConfig, SystemBarsConfig, SystemBarsState, BarState } from './types';

export async function setStatusBar(config: BarConfig): Promise<void> {
  await invoke('plugin:system-bars|set_status_bar', {
    color: config.color ?? null,
    style: config.style ?? null,
  });
}

export async function setNavigationBar(config: BarConfig): Promise<void> {
  await invoke('plugin:system-bars|set_navigation_bar', {
    color: config.color ?? null,
    style: config.style ?? null,
  });
}

export async function setSystemBars(config: SystemBarsConfig): Promise<void> {
  await invoke('plugin:system-bars|set_system_bars', {
    config: {
      status_bar: config.statusBar
        ? {
            color: config.statusBar.color ?? null,
            style: config.statusBar.style ?? null,
            hidden: config.statusBar.hidden ?? null,
            contrast_enforced: config.statusBar.contrastEnforced ?? null,
          }
        : null,
      navigation_bar: config.navigationBar
        ? {
            color: config.navigationBar.color ?? null,
            style: config.navigationBar.style ?? null,
            hidden: config.navigationBar.hidden ?? null,
            contrast_enforced: config.navigationBar.contrastEnforced ?? null,
          }
        : null,
    },
  });
}

export async function getSystemBars(): Promise<SystemBarsState> {
  return invoke<SystemBarsState>('plugin:system-bars|get_system_bars');
}

export async function enableEdgeToEdge(enabled: boolean = true): Promise<void> {
  await invoke('plugin:system-bars|enable_edge_to_edge', { enabled });
}

export async function setFullscreen(fullscreen: boolean): Promise<void> {
  await invoke('plugin:system-bars|set_fullscreen', { fullscreen });
}

export async function hideSystemBars(): Promise<void> {
  await invoke('plugin:system-bars|hide_system_bars');
}

export async function showSystemBars(): Promise<void> {
  await invoke('plugin:system-bars|show_system_bars');
}

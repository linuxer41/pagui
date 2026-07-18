export interface BarConfig {
  color?: string;
  style?: 'dark' | 'light';
  hidden?: boolean;
  contrastEnforced?: boolean;
}

export interface SystemBarsConfig {
  statusBar?: BarConfig;
  navigationBar?: BarConfig;
}

export interface BarState {
  color: string;
  style: string;
  hidden: boolean;
}

export interface SystemBarsState {
  statusBar: BarState;
  navigationBar: BarState;
}

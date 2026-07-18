use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

use crate::Result;

#[cfg(mobile)]
use crate::mobile;

#[derive(Debug, Serialize, Deserialize)]
pub struct BarConfig {
    pub color: Option<String>,
    pub style: Option<String>,
    pub hidden: Option<bool>,
    pub contrast_enforced: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemBarsConfig {
    pub status_bar: Option<BarConfig>,
    pub navigation_bar: Option<BarConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemBarsState {
    pub status_bar: BarState,
    pub navigation_bar: BarState,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BarState {
    pub color: String,
    pub style: String,
    pub hidden: bool,
}

#[tauri::command]
pub async fn set_status_bar<R: Runtime>(
    app: AppHandle<R>,
    color: Option<String>,
    style: Option<String>,
) -> Result<()> {
    #[cfg(mobile)]
    mobile::set_status_bar(&app, color, style)?;
    #[cfg(not(mobile))]
    let _ = (&app, color, style);
    Ok(())
}

#[tauri::command]
pub async fn set_navigation_bar<R: Runtime>(
    app: AppHandle<R>,
    color: Option<String>,
    style: Option<String>,
) -> Result<()> {
    #[cfg(mobile)]
    mobile::set_navigation_bar(&app, color, style)?;
    #[cfg(not(mobile))]
    let _ = (&app, color, style);
    Ok(())
}

#[tauri::command]
pub async fn set_system_bars<R: Runtime>(
    app: AppHandle<R>,
    config: SystemBarsConfig,
) -> Result<()> {
    #[cfg(mobile)]
    mobile::set_system_bars(&app, config)?;
    #[cfg(not(mobile))]
    let _ = (&app, config);
    Ok(())
}

#[tauri::command]
pub async fn get_system_bars<R: Runtime>(app: AppHandle<R>) -> Result<SystemBarsState> {
    #[cfg(mobile)]
    return mobile::get_system_bars(&app);
    #[cfg(not(mobile))]
    {
        let _ = &app;
        Ok(SystemBarsState {
            status_bar: BarState {
                color: "#00000000".into(),
                style: "dark".into(),
                hidden: false,
            },
            navigation_bar: BarState {
                color: "#00000000".into(),
                style: "dark".into(),
                hidden: false,
            },
        })
    }
}

#[tauri::command]
pub async fn enable_edge_to_edge<R: Runtime>(app: AppHandle<R>, enabled: bool) -> Result<()> {
    #[cfg(mobile)]
    mobile::enable_edge_to_edge(&app, enabled)?;
    #[cfg(not(mobile))]
    let _ = (&app, enabled);
    Ok(())
}

#[tauri::command]
pub async fn set_fullscreen<R: Runtime>(app: AppHandle<R>, fullscreen: bool) -> Result<()> {
    #[cfg(mobile)]
    mobile::set_fullscreen(&app, fullscreen)?;
    #[cfg(not(mobile))]
    let _ = (&app, fullscreen);
    Ok(())
}

#[tauri::command]
pub async fn hide_system_bars<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    #[cfg(mobile)]
    mobile::hide_system_bars(&app)?;
    #[cfg(not(mobile))]
    let _ = &app;
    Ok(())
}

#[tauri::command]
pub async fn show_system_bars<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    #[cfg(mobile)]
    mobile::show_system_bars(&app)?;
    #[cfg(not(mobile))]
    let _ = &app;
    Ok(())
}

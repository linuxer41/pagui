#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(mobile)]
    let builder = builder
        .plugin(tauri_plugin_barcode_scanner::init())
        .plugin(tauri_plugin_camera::init())
        .plugin(tauri_plugin_biometric::init())
        .plugin(tauri_plugin_nfc::init())
        .plugin(tauri_plugin_share::init())
        .plugin(tauri_plugin_system_bars::init());

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::{LogicalSize, Manager};
                if let Some(window) = app.get_webview_window("main") {
                    let monitor = window
                        .current_monitor()
                        .ok()
                        .flatten()
                        .or_else(|| window.primary_monitor().ok().flatten());
                    if let Some(monitor) = monitor {
                        let scale = monitor.scale_factor();
                        let area = monitor.work_area();
                        let avail_w = area.size.width as f64 / scale;
                        let avail_h = (area.size.height as f64 / scale) - 12.0;
                        let mut h = 900.0_f64.min(avail_h);
                        let mut w = h * 9.0 / 16.0;
                        if w > avail_w {
                            w = avail_w;
                            h = w * 16.0 / 9.0;
                        }
                        let _ = window.set_size(LogicalSize::new(w.round(), h.round()));
                        let _ = window.center();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

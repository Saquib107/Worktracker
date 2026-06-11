package com.pgepl.worktracker;

import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void saveFile(String base64Data, String filename) {
                try {
                    byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
                    File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File file = new File(path, filename);
                    
                    FileOutputStream os = new FileOutputStream(file);
                    os.write(fileBytes);
                    os.flush();
                    os.close();

                    runOnUiThread(() -> {
                        Toast.makeText(getApplicationContext(), "File securely saved to Downloads folder!", Toast.LENGTH_LONG).show();
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() -> {
                        Toast.makeText(getApplicationContext(), "Failed to save: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    });
                }
            }
        }, "AndroidDownloader");
    }
}
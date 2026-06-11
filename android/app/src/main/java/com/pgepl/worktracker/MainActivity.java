package com.pgepl.worktracker;

import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.DownloadListener;
import android.webkit.WebView;
import android.widget.Toast;
import android.content.Intent;
import android.net.Uri;
import java.io.File;
import java.io.FileOutputStream;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url.startsWith("data:")) {  
                    try {
                        String base64Data = url.substring(url.indexOf(",") + 1);
                        byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
                        String extension = mimeType.contains("pdf") ? ".pdf" : (mimeType.contains("csv") ? ".csv" : ".xlsx");
                        
                        File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        File file = new File(path, "PGEPL_Export_" + System.currentTimeMillis() + extension);
                        
                        FileOutputStream os = new FileOutputStream(file);
                        os.write(fileBytes);
                        os.flush();
                        os.close();

                        runOnUiThread(() -> {
                            Toast.makeText(getApplicationContext(), "File securely saved to your phone's Downloads folder!", Toast.LENGTH_LONG).show();
                        });
                    } catch (Exception e) {
                        e.printStackTrace();
                        runOnUiThread(() -> {
                            Toast.makeText(getApplicationContext(), "Failed to save file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        });
                    }
                } else {
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setData(Uri.parse(url));
                    startActivity(i);
                }
            }
        });
    }
}

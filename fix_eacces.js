const fs = require('fs');

const mainActivityFile = 'android/app/src/main/java/com/pgepl/worktracker/MainActivity.java';
const mainActivityContent = `package com.pgepl.worktracker;

import android.os.Bundle;
import android.os.Environment;
import android.os.Build;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import android.content.ContentValues;
import android.net.Uri;
import android.provider.MediaStore;

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
                    String mimeType = filename.endsWith(".pdf") ? "application/pdf" : 
                                      (filename.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                        if (uri != null) {
                            OutputStream os = getContentResolver().openOutputStream(uri);
                            os.write(fileBytes);
                            os.close();
                            runOnUiThread(() -> Toast.makeText(getApplicationContext(), "File securely saved to Downloads!", Toast.LENGTH_LONG).show());
                        } else {
                            throw new Exception("Failed to create MediaStore entry");
                        }
                    } else {
                        File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        File file = new File(path, filename);
                        FileOutputStream os = new FileOutputStream(file);
                        os.write(fileBytes);
                        os.flush();
                        os.close();
                        runOnUiThread(() -> Toast.makeText(getApplicationContext(), "File securely saved to Downloads!", Toast.LENGTH_LONG).show());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() -> Toast.makeText(getApplicationContext(), "Failed to save: " + e.getMessage(), Toast.LENGTH_LONG).show());
                }
            }
        }, "AndroidDownloader");
    }
}`;

fs.writeFileSync(mainActivityFile, mainActivityContent, 'utf8');
console.log("Updated MainActivity.java with MediaStore fix");

const fs = require('fs');

const pageFile = 'app/dashboard/page.tsx';
let content = fs.readFileSync(pageFile, 'utf8');

const jsCodeToInsert = `  const downloadFile = async (dataUrl: string, fileName: string, base64Data: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDownloader) {
        (window as any).AndroidDownloader.saveFile(base64Data, fileName);
        return;
      }
    } catch (e: any) {
      console.error("Android native save failed:", e);
      alert("Native save failed: " + e.message);
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setTimeout(() => {
        window.location.href = dataUrl;
      }, 500);
    }
  };`;

const startIndex = content.indexOf('const downloadFile = async (dataUrl: string, fileName: string, base64Data: string) => {');
const endIndexStr = 'window.location.href = dataUrl;\n      }, 500);\n    }\n  };';
const endIndex = content.indexOf(endIndexStr) + endIndexStr.length;

if (startIndex === -1 || content.indexOf(endIndexStr) === -1) {
    console.log("Could not find blocks to replace in page.tsx.");
} else {
    content = content.substring(0, startIndex) + jsCodeToInsert + content.substring(endIndex);
    fs.writeFileSync(pageFile, content, 'utf8');
    console.log("Updated page.tsx");
}

const mainActivityFile = 'android/app/src/main/java/com/pgepl/worktracker/MainActivity.java';
const mainActivityContent = `package com.pgepl.worktracker;

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
}`;

fs.writeFileSync(mainActivityFile, mainActivityContent, 'utf8');
console.log("Updated MainActivity.java");

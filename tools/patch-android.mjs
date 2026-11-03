// Applies the app-specific settings to the generated Capacitor Android project.
// Run after `npx cap add android`. Environment: APP_VERSION_CODE, APP_VERSION_NAME.
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'android', 'app');
const edit = (path, change) => {
  const before = readFileSync(path, 'utf8'), after = change(before);
  if (after === before) throw new Error('Nothing changed in ' + path);
  writeFileSync(path, after);
};

// Version from the build number, so every new APK installs over the last one.
const code = String(Number(process.env.APP_VERSION_CODE || 1));
const name = process.env.APP_VERSION_NAME || '1.0.' + code;
edit(join(app, 'build.gradle'), text => text
  .replace(/versionCode \d+/, 'versionCode ' + code)
  .replace(/versionName "[^"]*"/, `versionName "${name}"`));

// Landscape like the browser version's fullscreen mode, without restarting on rotation.
edit(join(app, 'src/main/AndroidManifest.xml'), text => text
  .replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"'));

// Short name under the launcher icon; the window title keeps the full name.
edit(join(app, 'src/main/res/values/strings.xml'), text => text
  .replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">Boundary of Fates</string>'));

// Immersive full screen: hide the status and navigation bars, swipe to peek.
const activity = join(app, 'src/main/java/io/github/khooruizhe/tbg/MainActivity.java');
writeFileSync(activity, `package io.github.khooruizhe.tbg;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
console.log(`Android project patched: version ${name} (${code})`);

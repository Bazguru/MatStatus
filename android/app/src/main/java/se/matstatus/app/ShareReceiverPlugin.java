package se.matstatus.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Receives receipts shared to MatStatus from other apps (Kivra, Gmail, the
 * gallery …) via ACTION_SEND and hands them to the web layer.
 */
@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    private static final int MAX_BYTES = 15 * 1024 * 1024;

    private JSObject pending;

    @Override
    public void load() {
        pending = readIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        JSObject file = readIntent(intent);
        if (file != null) {
            pending = file;
            notifyListeners("fileShared", new JSObject());
        }
    }

    @PluginMethod
    public void consume(PluginCall call) {
        JSObject ret = new JSObject();
        if (pending != null) {
            ret.put("file", pending);
            pending = null;
            // Don't re-deliver the same share after a configuration change.
            getActivity().setIntent(new Intent(Intent.ACTION_MAIN));
        }
        call.resolve(ret);
    }

    private JSObject readIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return null;
        String type = intent.getType() != null ? intent.getType() : "application/octet-stream";

        Uri uri;
        if (Build.VERSION.SDK_INT >= 33) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        } else {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }

        JSObject file = new JSObject();
        if (uri == null) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text == null) return null;
            file.put("mimeType", "text/plain");
            file.put("data", text);
            return file;
        }

        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
                if (out.size() > MAX_BYTES) return null;
            }
            String resolved = getContext().getContentResolver().getType(uri);
            file.put("mimeType", resolved != null ? resolved : type);
            file.put("name", displayName(uri));
            file.put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            return file;
        } catch (Exception e) {
            return null;
        }
    }

    private String displayName(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) {
        }
        return uri.getLastPathSegment();
    }
}

package com.triplingo.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final int REQ_AUDIO = 11;
    private static final int REQ_SPEECH_INTENT = 12;

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private SpeechRecognizer recognizer;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private String pendingListenId = null;
    private String pendingListenLang = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("triplingo", Context.MODE_PRIVATE);
        if (!prefs.contains("apiKey") && BuildKey.KEY.length() > 0) {
            prefs.edit().putString("apiKey", BuildKey.KEY).apply();
        }
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(Color.parseColor("#0f172a"));
            getWindow().setNavigationBarColor(Color.parseColor("#0f172a"));
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0f172a"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
        tts = new TextToSpeech(this, this);
    }

    @Override
    public void onInit(int status) {
        ttsReady = (status == TextToSpeech.SUCCESS);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.goBack ? window.goBack() : 'exit'", new android.webkit.ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v != null && v.contains("exit")) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (recognizer != null) recognizer.destroy();
        super.onDestroy();
    }

    private void js(final String code) {
        ui.post(new Runnable() {
            @Override
            public void run() { web.evaluateJavascript(code, null); }
        });
    }

    private static String q(String s) {
        return JSONObject.quote(s == null ? "" : s);
    }

    private Locale toLocale(String tag) {
        if ("ja".equals(tag)) return Locale.JAPAN;
        if ("pt".equals(tag)) return new Locale("pt", "BR");
        if ("en".equals(tag)) return Locale.US;
        if ("es".equals(tag)) return new Locale("es", "ES");
        return Locale.US;
    }

    private String toBcp(String tag) {
        if ("ja".equals(tag)) return "ja-JP";
        if ("pt".equals(tag)) return "pt-BR";
        if ("es".equals(tag)) return "es-ES";
        return "en-US";
    }

    // ---------- Speech recognition ----------
    private void startListening(final String id, final String lang) {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingListenId = id;
            pendingListenLang = lang;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_AUDIO);
            return;
        }
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, toBcp(lang));
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, toBcp(lang));
        intent.putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", new String[]{toBcp(lang)});
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            // Fallback: system dialog
            try {
                pendingListenId = id;
                startActivityForResult(intent, REQ_SPEECH_INTENT);
            } catch (Exception e) {
                js("window.__onSpeech(" + q(id) + ", false, " + q("El reconocimiento de voz no está disponible. Instala/activa la app de Google.") + ")");
            }
            return;
        }
        if (recognizer != null) { recognizer.destroy(); }
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            boolean done = false;
            public void onReadyForSpeech(Bundle params) { js("window.__onSpeechState && window.__onSpeechState('ready')"); }
            public void onBeginningOfSpeech() { js("window.__onSpeechState && window.__onSpeechState('speaking')"); }
            public void onRmsChanged(float rmsdB) { }
            public void onBufferReceived(byte[] buffer) { }
            public void onEndOfSpeech() { js("window.__onSpeechState && window.__onSpeechState('processing')"); }
            public void onError(int error) {
                if (done) return;
                done = true;
                String msg;
                switch (error) {
                    case SpeechRecognizer.ERROR_NO_MATCH: msg = "No te entendí, inténtalo de nuevo."; break;
                    case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: msg = "No escuché nada. Habla después del tono."; break;
                    case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: msg = "Falta permiso de micrófono."; break;
                    case SpeechRecognizer.ERROR_NETWORK:
                    case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: msg = "Error de red del reconocedor de voz."; break;
                    case 12: case 13: msg = "Idioma no instalado para voz. Descárgalo en Ajustes > Google > Voz."; break;
                    default: msg = "Error de reconocimiento (" + error + ")."; break;
                }
                js("window.__onSpeech(" + q(id) + ", false, " + q(msg) + ")");
            }
            public void onResults(Bundle results) {
                if (done) return;
                done = true;
                ArrayList<String> r = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                JSONArray arr = new JSONArray();
                if (r != null) for (String x : r) arr.put(x);
                js("window.__onSpeech(" + q(id) + ", true, " + arr.toString() + ")");
            }
            public void onPartialResults(Bundle partial) {
                ArrayList<String> r = partial.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (r != null && r.size() > 0) js("window.__onSpeechPartial && window.__onSpeechPartial(" + q(r.get(0)) + ")");
            }
            public void onEvent(int eventType, Bundle params) { }
        });
        recognizer.startListening(intent);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQ_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED && pendingListenId != null) {
                startListening(pendingListenId, pendingListenLang);
            } else if (pendingListenId != null) {
                js("window.__onSpeech(" + q(pendingListenId) + ", false, " + q("Necesito permiso de micrófono para la práctica de voz.") + ")");
            }
            pendingListenId = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_SPEECH_INTENT && pendingListenId != null) {
            String id = pendingListenId;
            pendingListenId = null;
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                JSONArray arr = new JSONArray();
                if (r != null) for (String x : r) arr.put(x);
                js("window.__onSpeech(" + q(id) + ", true, " + arr.toString() + ")");
            } else {
                js("window.__onSpeech(" + q(id) + ", false, " + q("Cancelado.") + ")");
            }
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    // ---------- Gemini ----------
    private String httpPost(String model, String key, String body) throws Exception {
        URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent");
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(20000);
        c.setReadTimeout(90000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setRequestProperty("x-goog-api-key", key);
        OutputStream os = c.getOutputStream();
        os.write(body.getBytes("UTF-8"));
        os.close();
        int code = c.getResponseCode();
        InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        if (is != null) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bos.write(buf, 0, n);
            is.close();
        }
        String resp = new String(bos.toByteArray(), "UTF-8");
        if (code >= 400) throw new HttpErr(code, resp);
        return resp;
    }

    static class HttpErr extends Exception {
        int code;
        HttpErr(int code, String msg) { super(msg); this.code = code; }
    }

    private void callGemini(final String id, final String body) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                String key = prefs.getString("apiKey", "");
                if (key == null || key.trim().length() == 0) {
                    js("window.__onGemini(" + q(id) + ", false, " + q("Configura tu clave de Gemini en Ajustes.") + ")");
                    return;
                }
                String preferred = prefs.getString("model", "gemini-flash-latest");
                String[] models = new String[]{preferred, "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"};
                String lastErr = "Sin respuesta";
                ArrayList<String> tried = new ArrayList<String>();
                for (int attempt = 0; attempt < models.length; attempt++) {
                    String m = models[attempt];
                    if (m == null || m.length() == 0 || tried.contains(m)) continue;
                    tried.add(m);
                    try {
                        String resp = httpPost(m, key.trim(), body);
                        JSONObject o = new JSONObject(resp);
                        JSONArray cands = o.optJSONArray("candidates");
                        if (cands == null || cands.length() == 0) { lastErr = "Respuesta vacía"; continue; }
                        JSONArray parts = cands.getJSONObject(0).getJSONObject("content").getJSONArray("parts");
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < parts.length(); i++) {
                            JSONObject p = parts.getJSONObject(i);
                            if (p.optBoolean("thought", false)) continue;
                            sb.append(p.optString("text", ""));
                        }
                        js("window.__onGemini(" + q(id) + ", true, " + q(sb.toString()) + ")");
                        return;
                    } catch (HttpErr e) {
                        lastErr = "HTTP " + e.code + " (" + m + ")";
                        try {
                            JSONObject eo = new JSONObject(e.getMessage()).getJSONObject("error");
                            lastErr = eo.optString("message", lastErr);
                        } catch (Exception ignore) { }
                        if (e.code == 400 || e.code == 401 || e.code == 403) {
                            if (e.code != 400 || lastErr.toLowerCase().contains("key")) break;
                        }
                        try { Thread.sleep(600); } catch (InterruptedException ie) { }
                    } catch (Exception e) {
                        lastErr = "Error de conexión: " + e.getMessage();
                    }
                }
                js("window.__onGemini(" + q(id) + ", false, " + q(lastErr) + ")");
            }
        }).start();
    }

    // ---------- JS bridge ----------
    class Bridge {
        @JavascriptInterface
        public void speak(String text, String lang, float rate) {
            if (!ttsReady || tts == null) return;
            tts.setLanguage(toLocale(lang));
            tts.setSpeechRate(rate <= 0 ? 1.0f : rate);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "u" + System.currentTimeMillis());
        }

        @JavascriptInterface
        public void stopSpeak() { if (tts != null) tts.stop(); }

        @JavascriptInterface
        public boolean ttsHas(String lang) {
            if (!ttsReady || tts == null) return false;
            int r = tts.isLanguageAvailable(toLocale(lang));
            return r >= TextToSpeech.LANG_AVAILABLE;
        }

        @JavascriptInterface
        public void installVoices() {
            try {
                Intent i = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception ignore) { }
        }

        @JavascriptInterface
        public void listen(final String id, final String lang) {
            ui.post(new Runnable() {
                @Override
                public void run() { startListening(id, lang); }
            });
        }

        @JavascriptInterface
        public void stopListen() {
            ui.post(new Runnable() {
                @Override
                public void run() { if (recognizer != null) recognizer.stopListening(); }
            });
        }

        @JavascriptInterface
        public void gemini(String id, String body) { callGemini(id, body); }

        @JavascriptInterface
        public String getKey() { return prefs.getString("apiKey", ""); }

        @JavascriptInterface
        public void setKey(String k) { prefs.edit().putString("apiKey", k == null ? "" : k.trim()).apply(); }

        @JavascriptInterface
        public String getModel() { return prefs.getString("model", "gemini-flash-latest"); }

        @JavascriptInterface
        public void setModel(String m) { prefs.edit().putString("model", m == null ? "" : m.trim()).apply(); }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) v.vibrate(ms);
            } catch (Exception ignore) { }
        }
    }
}

// Public, non-secret configuration for "Hear".
// AcoustID client keys are free for non-commercial use and are meant to be embedded in client apps:
// register an application at https://acoustid.org/new-application and paste its client key here.
window.TC_HEAR_CONFIG = {
  acoustidClient: '',
  pollinationsKey: '', // optional free publishable key (pk_...) from enter.pollinations.ai for an extra LLM guess
  whisperModel: 'onnx-community/whisper-tiny',
  transformersUrl: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js',
  recordSeconds: 10,
};

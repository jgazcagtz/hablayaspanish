export const config = {
  runtime: 'edge',
};

const validVoices = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, voice = "nova" } = await req.json();
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Texto de entrada inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate and select voice
    const selectedVoice = validVoices.has(voice) ? voice : "nova";
    const maxLength = 4096; // OpenAI TTS character limit
    
    if (text.length > maxLength) {
      return new Response(JSON.stringify({ 
        error: `Texto demasiado largo (máximo ${maxLength} caracteres)`,
        details: `Recibido ${text.length} caracteres`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI TTS API
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: selectedVoice,
        input: text,
        response_format: "mp3"
      })
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Error en la generación de TTS');
    }

    // Stream the audio response directly
    return new Response(ttsResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
        'X-Voice-Used': selectedVoice
      },
    });

  } catch (error) {
    console.error('Error de TTS:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al generar voz',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

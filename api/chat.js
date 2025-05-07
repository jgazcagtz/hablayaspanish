export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages, model = 'gpt-4-turbo' } = await req.json();

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Array de mensajes inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare conversation history
    const conversationHistory = [
      {
        role: 'system',
        content: `Eres HablaYa!, un tutor de español amigable con IA. Ayuda a los usuarios a practicar conversación en español de forma natural.
        Pautas:
        1. Responde en español claro y neutral (2-3 oraciones)
        2. Corrige errores suavemente después de responder
        3. Adapta el nivel al del usuario
        4. Sé alentador y positivo
        5. Haz preguntas de seguimiento
        6. Enfócate en el uso práctico del español
        7. Usa español de Latinoamérica como variante principal
        Hora actual: ${new Date().toLocaleString()}`
      },
      ...messages
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 150,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Error en la completación del chat');
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No hubo respuesta de la IA');
    }

    return new Response(JSON.stringify({ message: aiMessage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error de Chat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al generar respuesta',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

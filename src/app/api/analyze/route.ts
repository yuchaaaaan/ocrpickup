import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { image, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    const googleApiKey = process.env.GOOGLE_VISION_API_KEY;

    console.log('API Request received');
    console.log('Dify Key configured:', !!difyApiKey);
    console.log('Google Key configured:', !!googleApiKey);

    if (!difyApiKey) {
      console.error('Missing Dify API Key');
      return NextResponse.json({ error: 'Dify API Key is not configured' }, { status: 500 });
    }
    if (!googleApiKey) {
      console.error('Missing Google Vision API Key');
      return NextResponse.json({ error: 'Google Vision API Key is not configured' }, { status: 500 });
    }

    // 1. Google Cloud Vision API OCR (REST API)
    // imageは "data:image/png;base64,..." 形式
    const base64Data = image.split(',')[1];

    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`;

    const visionPayload = {
      requests: [
        {
          image: {
            content: base64Data
          },
          features: [
            {
              type: "TEXT_DETECTION"
            }
          ]
        }
      ]
    };

    const visionRes = await fetch(visionApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(visionPayload)
    });

    if (!visionRes.ok) {
      const errorText = await visionRes.text();
      console.error('Vision API failed:', errorText);
      return NextResponse.json({ error: `Vision API Error: ${errorText}` }, { status: visionRes.status });
    }

    const visionData = await visionRes.json();
    const detections = visionData.responses[0]?.textAnnotations;
    const ocrText = detections && detections.length > 0 ? detections[0].description : '';

    if (!ocrText) {
      return NextResponse.json({ error: 'No text detected in the image.' }, { status: 400 });
    }

    // 2. Dify Workflow API Payload
    // ワークフローAPIのエンドポイントは /workflows/run
    // inputs に変数を渡す
    const workflowPayload = {
      inputs: {
        ocr_text: ocrText,
        // プロンプトも変数として渡したい場合はここに追加可能だが、
        // 今回はOCRテキストをメインの入力とする
        user_prompt: prompt || "抽出してください"
      },
      response_mode: "blocking",
      user: "image-extractor-user"
    };

    const workflowRes = await fetch(`${difyApiUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowPayload),
    });

    if (!workflowRes.ok) {
      const errorText = await workflowRes.text();
      console.error('Workflow failed:', errorText);
      return NextResponse.json({ error: `Analysis failed: ${errorText}` }, { status: workflowRes.status });
    }

    const workflowData = await workflowRes.json();

    // Workflow APIのレスポンス構造:
    // { data: { outputs: { result: "..." }, status: "succeeded" } }
    // アプリ側で設定した出力変数名 (例: result) に入っている
    const resultText = workflowData.data?.outputs?.result || JSON.stringify(workflowData.data?.outputs, null, 2);

    // フロントエンドは { answer: ... } を期待しているため形式を合わせるか、
    // フロントエンド側を修正する。ここではフロントエンドの修正を最小限にするため answer に詰める。
    return NextResponse.json({ answer: resultText });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

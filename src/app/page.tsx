'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileImage, Loader2, AlertCircle, Copy, Check } from 'lucide-react';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setError(null);
      setResult('');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);
    setResult('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: image,
          prompt: "この画像から文字情報を抽出し、構造化されたリスト形式で出力してください。項目名と値が明確になるようにしてください。",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '解析に失敗しました');
      }

      // Difyのレスポンス形式に合わせて調整
      // data.answer がテキストレスポンスの場合が多い
      setResult(data.answer || JSON.stringify(data, null, 2));

    } catch (err: any) {
      setError(err.message || '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">画像データ抽出ツール</h1>
          <p className="text-gray-500">画像をアップロードして、AIが内容を解析・抽出します</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>画像のアップロード</CardTitle>
              <CardDescription>解析したい画像をドラッグ＆ドロップしてください</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div
                className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 transition-colors min-h-[300px] ${image ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                {image ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-md">
                    <img src={image} alt="Preview" className="max-w-full max-h-[400px] object-contain" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <p className="text-white font-medium">画像を変更</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center cursor-pointer">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload size={32} />
                    </div>
                    <p className="text-lg font-medium text-gray-700">クリックまたはドラッグ＆ドロップ</p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG, GIF (Max 10MB)</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!image || loading}
                className="w-full text-lg py-6"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <FileImage className="mr-2 h-5 w-5" />
                    解析を開始
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Result Section */}
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>解析結果</CardTitle>
                <CardDescription>抽出されたデータがここに表示されます</CardDescription>
              </div>
              {result && (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'コピー完了' : 'コピー'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ScrollArea className="h-[500px] w-full rounded-md border p-4 bg-white">
                {result ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                    {result}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <FileImage size={48} className="mb-4 opacity-20" />
                    <p>解析結果待ち...</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

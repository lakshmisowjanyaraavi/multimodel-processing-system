import React, { useState, useRef } from 'react';
import { Upload, FileText, Search, Trash2, AlertCircle } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

const MultimodalProcessor = () => {
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  GlobalWorkerOptions.workerSrc = `http://localhost:3000/pdf.worker.min.mjs`;
  const BACKEND_URL = 'http://localhost:5000/api/query';

  const getFileCategory = (type, name) => {
    if (type.startsWith('text/') || name.match(/\.(txt|md|pdf|docx|pptx)$/i)) return 'text';
    if (type.startsWith('image/') || name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return 'image';
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg)$/i)) return 'audio';
    if (type.startsWith('video/') || name.match(/\.(mp4|webm|mov)$/i)) return 'video';
    return 'other';
  };

  const extractTextFromPdf = async (arrayBuffer) => {
    const pdf = await getDocument(arrayBuffer).promise;
    let text = '';
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(' ') + '\n';
    }
    return text;
  };

  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        if (file.type === 'application/pdf') {
          const text = await extractTextFromPdf(content);
          resolve({ id: Date.now(), name: file.name, type: file.type, size: file.size, content: text, category: getFileCategory(file.type, file.name) });
        } else {
          resolve({ id: Date.now(), name: file.name, type: file.type, size: file.size, content, category: getFileCategory(file.type, file.name) });
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files?.length) return;
    const processed = await processFile(e.target.files[0]);
    setFiles([processed]);
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const buildContext = (files) =>
    files.map((f) => `File: ${f.name}\nContent: ${f.content?.toString().slice(0, 1000)}...`).join('\n\n');

  const handleQuery = async () => {
    if (!query.trim()) return setError('Please enter a question');
    if (files.length === 0) return setError('Please upload a file');
    setError('');
    setLoading(true);
    try {
      const context = buildContext(files);
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Context:\n${context}\n\nQuery:\n${query}` }),
      });
      const data = await res.json();
      setResponse(data.answer || 'No response found');
    } catch (err) {
      setError('Backend error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col items-center p-8">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Multimodal Data Processing System</h1>
          <p className="text-gray-500">Upload documents, ask questions, and get AI-powered answers</p>
        </div>

        {/* Upload Section */}
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
          <label className="cursor-pointer w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition">
            <Upload className="w-5 h-5" /> Upload Files
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </label>

          {files.length > 0 && (
            <div className="mt-4 space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <p className="font-medium">{file.name}</p>
                  </div>
                  <button onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Query Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-700">
            <Search className="w-5 h-5 text-blue-500" /> Ask a Question
          </h2>
          <textarea
            className="w-full p-4 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 resize-none outline-none"
            rows="4"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your uploaded files..."
          />
          <button
            onClick={handleQuery}
            disabled={loading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex justify-center gap-2 transition"
          >
            {loading ? 'Processing...' : 'Search'}
          </button>
        </div>

        {/* Response Section */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-600 rounded-xl p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {response && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-blue-600">Response</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultimodalProcessor;

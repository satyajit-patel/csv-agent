'use client';

import { useState, useRef } from 'react';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const messagesEndRef = useRef(null);
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFileName(selectedFile.name);
      processFile(selectedFile);
    } else {
      alert('Please upload a CSV file');
      e.target.value = null;
    }
  };
  
  const processFile = async (csvFile) => {
    setIsFileLoading(true);
    try {
      const text = await csvFile.text();
      setCsvContent(text);
      setIsProcessed(true);
      setIsFileLoading(false);
      setMessages([{
        role: 'assistant',
        content: `CSV loaded. Ask questions about your data.`
      }]);
    } catch (error) {
      console.error('Error:', error);
      setIsFileLoading(false);
      alert('Error processing CSV file. Try again.');
    }
  };

  const resetUpload = () => {
    setIsProcessed(false);
    setCsvContent('');
    setMessages([]);
    setFileName('');
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isResponding) return;
    
    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    const userQuery = inputMessage;
    setInputMessage('');
    setIsResponding(true);
    
    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '...', isLoading: true }]);
      
      const llm = new ChatGroq({
        model: "llama-3.3-70b-versatile",
        apiKey: process.env.NEXT_PUBLIC_QROQ_API_KEY
      });
      
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful data science assistant. Format your responses with markdown for better readability."],
        ["user", `give a short and crisp answer about this question 
          {question} 
          using this content 
          {content}
          Use markdown formatting for clarity where appropriate.
        `],
      ]);
      
      const prompt = await promptTemplate.invoke({ 
        question: userQuery, 
        content: csvContent
      });
      
      const response = await llm.invoke(prompt);
      
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    } catch (error) {
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error analyzing data. Please try again.' 
      }]);
    } finally {
      setIsResponding(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <main className="flex flex-col h-screen bg-black text-gray-200">
      <header className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">CSV AI Analyst</h1>
          <p className="text-gray-400 text-sm">Upload CSV, chat with AI about your data</p>
        </div>
        {isProcessed && (
          <button 
            onClick={resetUpload}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm rounded px-3 py-1"
          >
            Upload New File
          </button>
        )}
      </header>
      
      <div className="flex flex-grow overflow-hidden">
        {!isProcessed ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
              <div className="mb-5">
                <svg className="mx-auto h-16 w-16 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
              </div>
              <h2 className="text-xl font-medium mb-3 text-white">Upload CSV</h2>
              
              <label className="block">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  disabled={isFileLoading}
                  className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0 file:text-sm file:font-medium
                  file:bg-gray-900 file:text-gray-300 hover:file:bg-gray-800
                  cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
              
              {isFileLoading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 bg-black">
              {fileName && (
                <div className="mb-3 text-xs text-gray-500">
                  File: {fileName}
                </div>
              )}
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div 
                    className={`inline-block rounded px-4 py-2 max-w-[80%] ${
                      message.role === 'user' 
                        ? 'bg-indigo-800 text-white' 
                        : 'bg-gray-900 text-gray-200'
                    } ${message.isLoading ? 'opacity-70' : ''}`}
                  >
                    {message.role === 'assistant' && !message.isLoading ? (
                      <div className="prose prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about your data..."
                  disabled={isResponding}
                  className="flex-1 bg-gray-900 text-white rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-700"
                />
                <button
                  type="submit"
                  disabled={isResponding || !inputMessage.trim()}
                  className="bg-indigo-800 hover:bg-indigo-900 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
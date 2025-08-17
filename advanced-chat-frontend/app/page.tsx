// To run this:
// 1. Create a new Next.js project: npx create-next-app@latest advanced-chat-frontend
// 2. Choose TypeScript and Tailwind CSS during setup.
// 3. cd advanced-chat-frontend
// 4. Install dependencies: npm i lucide-react crypto-js @types/crypto-js emoji-picker-react
// 5. Replace the content of app/page.tsx with this entire code block.
// 6. Create the next.config.js file as described in the setup guide.
// 7. Make sure your NestJS backend is running.
// 8. Run the frontend: npm run dev

'use client';

import React, { useState, useEffect, useRef, createContext, useContext, FC, ReactNode } from 'react';
import { Phone, PhoneIncoming, PhoneOff, Send, Paperclip, User, Users, LogOut, Mic, MicOff, Link2, Music, Smile, Trash2, Edit } from 'lucide-react';
import type { EmojiClickData } from 'emoji-picker-react';
import dynamic from 'next/dynamic';
import { Theme } from 'emoji-picker-react';

const CryptoJS = require('crypto-js');
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });


// --- TYPES AND INTERFACES ---
interface User {
  id: string;
  name: string;
  status: 'online' | 'busy';
}

interface Message {
  id: string; // Unique ID for each message
  text?: string;
  file?: { name: string; url: string; data: string };
  sender: User;
  target: 'general' | string;
  timestamp: string;
  isMe: boolean;
  isEdited?: boolean;
}

interface SocketContextType {
  socket: WebSocket | null;
  currentUser: User | null;
  users: User[];
  sendMessage: (type: string, payload: any) => void;
}

// --- REACT CONTEXT FOR SOCKET ---
const SocketContext = createContext<SocketContextType | null>(null);

const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

// --- ENCRYPTION UTILITIES ---
const ENCRYPTION_KEY = 'my-super-secret-local-network-key';
const encrypt = (text: string) => CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
const decrypt = (ciphertext: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "Failed to decrypt message.";
  }
};

// --- UI COMPONENTS ---

const LoginPage: FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim());
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">Advanced Chat</h1>
          <p className="mt-2 text-gray-400">Connect to your local network</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-300">
            Connect
          </button>
        </form>
      </div>
    </div>
  );
};

const UserList: FC<{ onSelectChat: (id: string, name: string) => void; selectedChatId: string; onLogout: () => void }> = ({ onSelectChat, selectedChatId, onLogout }) => {
  const { users, currentUser } = useSocket();

  const StatusIndicator: FC<{ status: 'online' | 'busy' }> = ({ status }) => (
    <span className={`w-3 h-3 rounded-full mr-3 ${status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
  );

  return (
    <div className="w-1/4 bg-gray-800/50 backdrop-blur-sm p-4 flex flex-col border-r border-gray-700/50">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center"><Users className="mr-2" /> Members</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        <div
          onClick={() => onSelectChat('general', 'General Room')}
          className={`p-3 mb-2 rounded-lg cursor-pointer flex items-center transition-colors ${selectedChatId === 'general' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <Users size={20} className="mr-3" /> General Room
        </div>
        {users.filter(u => u.id !== currentUser?.id).map(user => (
          <div
            key={user.id}
            onClick={() => onSelectChat(user.id, user.name)}
            className={`p-3 mb-2 rounded-lg cursor-pointer flex items-center transition-colors ${selectedChatId === user.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            <StatusIndicator status={user.status} />
            <span>{user.name}</span>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-gray-700/50">
         <h3 className="text-lg font-semibold text-white mb-2">My Info</h3>
         <p className="text-sm text-gray-400 truncate">Name: <span className="font-mono">{currentUser?.name}</span></p>
         <p className="text-sm text-gray-400 truncate">ID: <span className="font-mono">{currentUser?.id}</span></p>
         <button onClick={onLogout} className="w-full mt-4 flex items-center justify-center py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
            <LogOut size={16} className="mr-2"/> Logout
         </button>
      </div>
    </div>
  );
};

const MessageContent: FC<{ text: string }> = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const url = parts.find(part => urlRegex.test(part));
    if (url) {
      setIsLoading(true);
      setPreview(null);

      const youtubeId = getYoutubeId(url);
      if (youtubeId) {
        setPreview({
          url: url,
          image: `https://img.youtube.com/vi/${youtubeId}/0.jpg`,
          title: 'YouTube Video',
          siteName: 'YouTube',
          contentType: 'video/youtube'
        });
        setIsLoading(false);
      } else {
        fetch(`/api/preview?url=${encodeURIComponent(url)}`)
          .then(res => {
            if (!res.ok) throw new Error('Preview failed');
            return res.json();
          })
          .then(data => {
            if (data && (data.title || data.image || data.audioUrl)) {
              setPreview(data);
            }
          })
          .catch(err => console.error("Failed to fetch preview:", err))
          .finally(() => setIsLoading(false));
      }
    }
  }, [text]);

  return (
    <div>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <React.Fragment key={index}>
              <a href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {part}
              </a>
              {isLoading && (
                <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700 max-w-xs animate-pulse">
                  <div className="h-24 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 mt-2"></div>
                </div>
              )}
              {preview && !isLoading && (
                 <div className="mt-2 bg-gray-800 rounded-lg border border-gray-700 max-w-xs overflow-hidden">
                  {preview.image && <img src={preview.image} alt={preview.title || 'Link preview'} className="w-full object-cover max-h-40" />}
                  {preview.audioUrl && (
                    <audio controls src={preview.audioUrl} className="w-full h-12" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center text-gray-400">
                      {preview.contentType?.startsWith('audio/') ? <Music size={16} className="mr-2 flex-shrink-0" /> : <Link2 size={16} className="mr-2 flex-shrink-0" />}
                      <span className="text-xs font-semibold truncate">{preview.siteName || new URL(preview.url).hostname}</span>
                    </div>
                    {preview.title && <p className="text-sm font-bold text-white mt-1 line-clamp-2">{preview.title}</p>}
                    {preview.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preview.description}</p>}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        }
        return part;
      })}
    </div>
  );
};


const ChatMessage: FC<{ msg: Message; onEdit: (id: string, text: string) => void; onDelete: (id: string) => void; }> = ({ msg, onEdit, onDelete }) => {
  const bubbleClass = msg.isMe ? 'bg-blue-600 self-end' : 'bg-gray-700 self-start';
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || '');

  const handleSaveEdit = () => {
    onEdit(msg.id, editText);
    setIsEditing(false);
  };

  return (
    <div className={`group flex items-end gap-2 mb-4 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
      <div className={`max-w-lg p-3 rounded-xl ${bubbleClass} break-words`}>
        {isEditing ? (
          <div>
            <input 
              type="text" 
              value={editText} 
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-gray-900/50 p-2 rounded"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
            />
            <div className="text-right mt-2">
              <button onClick={() => setIsEditing(false)} className="text-xs text-gray-400 mr-2">Cancel</button>
              <button onClick={handleSaveEdit} className="text-xs text-blue-400">Save</button>
            </div>
          </div>
        ) : (
          <>
            {msg.text && <MessageContent text={msg.text} />}
            {msg.file && (
                <a href={msg.file.data} download={msg.file.name} className="flex items-center underline text-blue-300">
                    <Paperclip size={16} className="mr-2" /> {msg.file.name}
                </a>
            )}
            {msg.isEdited && <span className="text-xs text-gray-400/70 ml-2">(edited)</span>}
          </>
        )}
      </div>
      {msg.isMe && !isEditing && msg.text && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-white"><Edit size={14} /></button>
          <button onClick={() => onDelete(msg.id)} className="p-1 text-gray-400 hover:text-white"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
};

const ChatWindow: FC<{ selectedChat: { id: string, name: string }, onStartCall: () => void, initialHistory: Record<string, Message[]> }> = ({ selectedChat, onStartCall, initialHistory }) => {
  const { sendMessage, currentUser, users } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState(initialHistory);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();
  const selectedUser = users.find(u => u.id === selectedChat.id);
  
  const emojiMap: { [key: string]: string } = {
    ':)': '😊', ':-)': '😊',
    ':D': '😀', ':-D': '😀',
    ':(': '😞', ':-(': '�',
    ':O': '😮', ':-O': '😮',
    '<3': '❤️',
    ':P': '😛', ':-P': '😛',
    ';)': '😉', ';-)': '😉',
  };

  const replaceEmojiCodes = (text: string) => {
    let newText = text;
    const sortedCodes = Object.keys(emojiMap).sort((a, b) => b.length - a.length);
    sortedCodes.forEach(code => {
      newText = newText.replace(new RegExp(code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), emojiMap[code]);
    });
    return newText;
  };

  useEffect(() => {
    if (socket) {
        const handleMessage = (event: MessageEvent) => {
            const { event: msgEvent, data } = JSON.parse(event.data);
            
            if (msgEvent === 'new_message' || msgEvent === 'new_file_message') {
                const decryptedPayload = data.payload ? JSON.parse(decrypt(data.payload)) : null;
                const newMsg: Message = { ...data, ...decryptedPayload, isMe: false };
                const chatKey = newMsg.target === 'general' ? 'general' : newMsg.sender.id;
                setChatHistory(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] || []), newMsg] }));
            }
            if (msgEvent === 'message_edited') {
              const { messageId, newText, target } = data;
              setChatHistory(prev => {
                const newHistory = { ...prev };
                const chat = newHistory[target] || [];
                const msgIndex = chat.findIndex(m => m.id === messageId);
                if (msgIndex > -1) {
                  chat[msgIndex].text = newText;
                  chat[msgIndex].isEdited = true;
                }
                return newHistory;
              });
            }
            if (msgEvent === 'message_deleted') {
              const { messageId, target } = data;
              setChatHistory(prev => {
                const newHistory = { ...prev };
                newHistory[target] = (newHistory[target] || []).filter(m => m.id !== messageId);
                return newHistory;
              });
            }
        };
        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket]);
  
  useEffect(() => {
    if (currentUser && Object.keys(chatHistory).length > 0) {
      const encryptedHistory = encrypt(JSON.stringify(chatHistory));
      localStorage.setItem(`chat_history_${currentUser.id}`, encryptedHistory);
    }
  }, [chatHistory, currentUser]);

  useEffect(() => { setMessages(chatHistory[selectedChat.id] || []); }, [selectedChat, chatHistory]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = (text: string) => {
    if (!text || !currentUser) return;
    const textWithEmojis = replaceEmojiCodes(text);
    const messageId = CryptoJS.lib.WordArray.random(16).toString();
    const payload = { id: messageId, text: textWithEmojis };
    const encryptedPayload = encrypt(JSON.stringify(payload));
    const messageType = selectedChat.id === 'general' ? 'general_message' : 'private_message';
    sendMessage(messageType, { payload: encryptedPayload, targetId: selectedChat.id });
    const newMsg: Message = { id: messageId, text: textWithEmojis, sender: currentUser, target: selectedChat.id, timestamp: new Date().toISOString(), isMe: true };
    setChatHistory(prev => ({ ...prev, [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg] }));
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please upload files under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      const messageId = CryptoJS.lib.WordArray.random(16).toString();
      const payload = { id: messageId, file: { name: file.name, data: fileData } };
      const encryptedPayload = encrypt(JSON.stringify(payload));
      const messageType = selectedChat.id === 'general' ? 'file_message_general' : 'file_message_private';
      sendMessage(messageType, { payload: encryptedPayload, targetId: selectedChat.id });
      
      const newMsg: Message = { id: messageId, file: { name: file.name, url: '', data: fileData }, sender: currentUser, target: selectedChat.id, timestamp: new Date().toISOString(), isMe: true };
      setChatHistory(prev => ({ ...prev, [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg] }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    sendMessage('edit_message', { messageId, newText, target: selectedChat.id });
    setChatHistory(prev => {
      const newHistory = { ...prev };
      const chat = newHistory[selectedChat.id] || [];
      const msgIndex = chat.findIndex(m => m.id === messageId);
      if (msgIndex > -1) {
        chat[msgIndex].text = newText;
        chat[msgIndex].isEdited = true;
      }
      return newHistory;
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      sendMessage('delete_message', { messageId, target: selectedChat.id });
      setChatHistory(prev => {
        const newHistory = { ...prev };
        newHistory[selectedChat.id] = (newHistory[selectedChat.id] || []).filter(m => m.id !== messageId);
        return newHistory;
      });
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    if (messageInputRef.current) {
      messageInputRef.current.value += emojiData.emoji;
    }
  };

  return (
    <div className="w-3/4 flex flex-col bg-gray-900/80 backdrop-blur-sm">
      <header className="p-4 flex items-center justify-between border-b border-gray-700/50">
        <h2 className="text-xl font-bold text-white">{selectedChat.name}</h2>
        <div className="flex items-center space-x-2">
          {selectedChat.id !== 'general' && (
            <button 
              onClick={onStartCall} 
              disabled={selectedUser?.status === 'busy'}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <Phone size={20} />
            </button>
          )}
        </div>
      </header>
      <main className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} onEdit={handleEditMessage} onDelete={handleDeleteMessage} />)}
        <div ref={messagesEndRef} />
      </main>
      <footer className="p-4 border-t border-gray-700/50 relative">
        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2">
            <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(e.currentTarget.message.value); e.currentTarget.reset(); }} className="flex items-center space-x-4">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"><Paperclip /></button>
          <button type="button" onClick={() => setShowEmojiPicker(p => !p)} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"><Smile /></button>
          <input ref={messageInputRef} name="message" placeholder="Type an encrypted message..." className="flex-grow bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"><Send /></button>
        </form>
      </footer>
    </div>
  );
};

const IncomingCallModal: FC<{ callerName: string; onAccept: () => void; onReject: () => void; }> = ({ callerName, onAccept, onReject }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center space-y-4">
            <h2 className="text-2xl font-bold">Incoming Call</h2>
            <p className="text-lg">from <span className="font-bold text-blue-400">{callerName}</span></p>
            <div className="flex space-x-4 justify-center pt-4">
                <button onClick={onAccept} className="p-4 bg-green-600 hover:bg-green-700 rounded-full"><PhoneIncoming /></button>
                <button onClick={onReject} className="p-4 bg-red-600 hover:bg-red-700 rounded-full"><PhoneOff /></button>
            </div>
        </div>
    </div>
);

const InCallModal: FC<{
  calleeName: string;
  onHangUp: () => void;
  localStream: MediaStream | null;
}> = ({ calleeName, onHangUp, localStream }) => {
  const [isMuted, setIsMuted] = useState(false);
  const visualizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStream || !visualizerRef.current) return;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(localStream);
    source.connect(analyser);
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const renderFrame = () => {
      animationFrameId = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      
      if (visualizerRef.current) {
        const intensity = (avg / 128); 
        const blur = Math.min(10 + intensity * 20, 50);
        const spread = Math.min(2 + intensity * 5, 15);
        
        visualizerRef.current.style.boxShadow = `
          0 0 ${blur / 2}px ${spread / 2}px rgba(192, 132, 252, 0.5),
          0 0 ${blur}px ${spread}px rgba(168, 85, 247, 0.7)
        `;
      }
    };
    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (visualizerRef.current) {
         visualizerRef.current.style.boxShadow = 'none';
      }
      source.disconnect();
      audioContext.close();
    };
  }, [localStream]);

  const handleMuteToggle = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center flex flex-col items-center space-y-6">
        <p className="text-lg">In call with</p>
        <h2 className="text-3xl font-bold">{calleeName}</h2>
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div
            ref={visualizerRef}
            className="absolute inset-0 rounded-full transition-all duration-100 ease-linear"
            style={{ boxShadow: '0 0 0px 0px #a855f7' }}
          />
          <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center">
              <Mic className="text-gray-400 w-16 h-16" />
          </div>
        </div>
        <div className="flex space-x-6 justify-center pt-4">
          <button onClick={handleMuteToggle} className="p-4 bg-gray-600 hover:bg-gray-700 rounded-full">
            {isMuted ? <MicOff /> : <Mic />}
          </button>
          <button onClick={onHangUp} className="p-4 bg-red-600 hover:bg-red-700 rounded-full">
            <PhoneOff />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedChat, setSelectedChat] = useState({ id: 'general', name: 'General Room' });
    const [incomingCall, setIncomingCall] = useState<{ sender: User; offer: any } | null>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [callee, setCallee] = useState<User | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [initialHistory, setInitialHistory] = useState<Record<string, Message[]>>({ general: [] });

    useEffect(() => {
        setIsMounted(true);
        const userId = localStorage.getItem('chat_user_id');
        if (userId) {
            const encryptedHistory = localStorage.getItem(`chat_history_${userId}`);
            if (encryptedHistory) {
                try {
                    const decrypted = decrypt(encryptedHistory);
                    setInitialHistory(JSON.parse(decrypted));
                } catch (e) {
                    console.error("Could not load history", e);
                    localStorage.removeItem(`chat_history_${userId}`);
                }
            }
        }
    }, []);

    const cleanupCall = () => {
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => track.stop()); localStreamRef.current = null; }
      if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null; }
      setIsCalling(false);
      setCallee(null);
      setIncomingCall(null);
    };

    const connectSocket = (name: string) => {
        const ws = new WebSocket(`wss://${window.location.hostname}:3001`);
        ws.onopen = () => { ws.send(JSON.stringify({ event: 'login', data: { name } })); };
        ws.onmessage = (event) => {
            const { event: msgEvent, data } = JSON.parse(event.data);
            switch (msgEvent) {
                case 'login_success': 
                    setCurrentUser(data.user);
                    localStorage.setItem('chat_user_id', data.user.id);
                    break;
                case 'user_list_update': setUsers(data.users); break;
                case 'webrtc_signal': handleSignaling(data); break;
                case 'target_busy': alert(`${data.name} is currently in another call.`); break;
                case 'call_ended': cleanupCall(); break;
            }
        };
        ws.onclose = () => { setCurrentUser(null); socketRef.current = null; };
        ws.onerror = () => { alert("Could not connect to the server."); };
        socketRef.current = ws;
    };

    const handleLogout = () => {
      socketRef.current?.close();
      localStorage.removeItem('chat_user_id');
    };
    const sendMessage = (type: string, payload: any) => { socketRef.current?.send(JSON.stringify({ event: type, data: payload })); };

    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    const createPeerConnection = (targetId: string) => {
        const pc = new RTCPeerConnection(rtcConfig);
        pc.onicecandidate = (e) => { if (e.candidate) { sendMessage('webrtc_signal', { targetId, type: 'ice_candidate', candidate: e.candidate }); } };
        pc.ontrack = (e) => { if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; } };
        
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            cleanupCall();
          }
        };

        localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
        return pc;
    };

    const handleStartCall = async () => {
        const targetUser = users.find(u => u.id === selectedChat.id);
        if (!targetUser || targetUser.status === 'busy') return;
        if (!navigator.mediaDevices) { alert("Your browser does not support voice calls."); return; }
        try {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            pcRef.current = createPeerConnection(targetUser.id);
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            sendMessage('webrtc_signal', { targetId: targetUser.id, type: 'offer', offer });
            setCallee(targetUser);
            setIsCalling(true);
        } catch (err) { console.error("Error starting call:", err); }
    };
    
    const handleSignaling = async (data: any) => {
        switch (data.type) {
            case 'offer': setIncomingCall({ sender: data.sender, offer: data.offer }); break;
            case 'answer': await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer)); break;
            case 'ice_candidate': await pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate)); break;
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;
        if (!navigator.mediaDevices) { alert("Your browser does not support voice calls."); return; }
        try {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            pcRef.current = createPeerConnection(incomingCall.sender.id);
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            sendMessage('webrtc_signal', { targetId: incomingCall.sender.id, type: 'answer', answer });
            setCallee(incomingCall.sender);
            setIsCalling(true);
            setIncomingCall(null);
        } catch (err) { console.error("Error answering call:", err); }
    };

    const handleRejectCall = () => {
      if (!incomingCall) return;
      sendMessage('end_call', { targetId: incomingCall.sender.id });
      setIncomingCall(null);
    };

    const handleHangUp = () => {
      const targetId = callee?.id || incomingCall?.sender.id;
      if (targetId) {
        sendMessage('end_call', { targetId });
      }
      cleanupCall();
    };

    if (!isMounted) return null;

    if (!currentUser) { return <LoginPage onLogin={connectSocket} />; }

    const socketContextValue: SocketContextType = { socket: socketRef.current, currentUser, users, sendMessage };

    return (
        <SocketProvider value={socketContextValue}>
            <div className="h-screen w-screen flex text-white bg-gray-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
                <UserList onSelectChat={(id, name) => setSelectedChat({ id, name })} selectedChatId={selectedChat.id} onLogout={handleLogout} />
                <ChatWindow selectedChat={selectedChat} onStartCall={handleStartCall} initialHistory={initialHistory} />
                {incomingCall && <IncomingCallModal callerName={incomingCall.sender.name} onAccept={handleAcceptCall} onReject={handleRejectCall} />}
                {isCalling && callee && <InCallModal calleeName={callee.name} onHangUp={handleHangUp} localStream={localStreamRef.current} />}
                <audio ref={remoteAudioRef} autoPlay />
            </div>
        </SocketProvider>
    );
};

const SocketProvider = SocketContext.Provider;

export default App;
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { socket } from '@/lib/socket';
import { Send, MessageCircle } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface Message {
  id: string;
  message: string;
  username: string;
  userId: string;
  createdAt: string;
}

export default function Chat({ roomId, user }: { roomId: string; user: User }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    socket.on('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('new-message');
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          message: msg.message,
          username: msg.user_id === user.id ? '💬' : '💬',
          userId: msg.user_id,
          createdAt: msg.created_at,
        }))
      );
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    socket.emit('send-message', {
      roomId,
      message: input.trim(),
      userId: user.id,
      username: '💬',
    });

    setInput('');
  };

  return (
    <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-2xl h-[500px] flex flex-col shadow-lg border-2 border-blue-100">
      <div className="bg-linear-to-r from-sky-400 to-cyan-400 px-5 py-4 rounded-t-2xl">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <MessageCircle size={22} strokeWidth={2.5} />
          Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="inline-block p-4 bg-white rounded-full mb-3 shadow-sm">
              <MessageCircle size={48} className="opacity-40 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation! 💬</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${
                msg.userId === user.id ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] wrap-break-word shadow-sm ${
                  msg.userId === user.id
                    ? 'bg-linear-to-r from-orange-400 to-orange-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md border border-blue-100'
                }`}
              >
                <div className={`text-xs mb-1 font-bold ${msg.userId === user.id ? 'opacity-90' : 'text-gray-500'}`}>
                  {msg.username}
                </div>
                <div className="font-medium">{msg.message}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t-2 border-blue-100 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-blue-50 text-gray-800 placeholder-gray-400 font-medium"
            maxLength={200}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-linear-to-r from-orange-400 to-orange-500 text-white p-3 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 duration-150"
          >
            <Send size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
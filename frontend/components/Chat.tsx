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
          username: msg.user_id === user.id ? 'You' : 'Opponent',
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
      username: 'You',
    });

    setInput('');
  };

  return (
    <div className="bg-gray-50 rounded-lg h-[500px] flex flex-col shadow-inner">
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 rounded-t-lg">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageCircle size={20} />
          Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
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
                className={`inline-block px-4 py-2 rounded-lg max-w-[80%] break-words ${
                  msg.userId === user.id
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="text-xs opacity-75 mb-1 font-semibold">
                  {msg.username}
                </div>
                <div>{msg.message}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
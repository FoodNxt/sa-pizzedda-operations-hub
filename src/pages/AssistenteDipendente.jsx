import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Bot, Send, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AssistenteDipendente() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: 'assistente_dipendenti' });
      setConversations(convs || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'assistente_dipendenti',
        metadata: {
          name: `Chat ${new Date().toLocaleDateString('it-IT')}`,
          user_name: user?.full_name || user?.email
        }
      });
      setCurrentConversation(conv);
      setMessages([]);
      loadConversations();

      // Salva riferimento nella entity per tracking admin
      await base44.entities.ConversazioneAssistente.create({
        conversation_id: conv.id,
        user_id: user?.id,
        user_name: user?.full_name || user?.nome_cognome || user?.email,
        user_email: user?.email,
        last_message_date: new Date().toISOString(),
        message_count: 0
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const loadConversation = async (conv) => {
    try {
      const fullConv = await base44.agents.getConversation(conv.id);
      setCurrentConversation(fullConv);
      setMessages(fullConv.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    let conv = currentConversation;
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: 'assistente_dipendenti',
        metadata: {
          name: `Chat ${new Date().toLocaleDateString('it-IT')}`,
          user_name: user?.full_name || user?.email
        }
      });
      setCurrentConversation(conv);
      loadConversations();

      // Salva riferimento nella entity per tracking admin
      await base44.entities.ConversazioneAssistente.create({
        conversation_id: conv.id,
        user_id: user?.id,
        user_name: user?.full_name || user?.nome_cognome || user?.email,
        user_email: user?.email,
        last_message_date: new Date().toISOString(),
        message_count: 0
      });
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });

      await base44.agents.addMessage(conv, userMessage);

      // Aggiorna tracking conversazione
      const tracking = await base44.entities.ConversazioneAssistente.filter({ conversation_id: conv.id });
      if (tracking.length > 0) {
        await base44.entities.ConversazioneAssistente.update(tracking[0].id, {
          last_message_date: new Date().toISOString(),
          message_count: (tracking[0].message_count || 0) + 1
        });
      }
      
      setTimeout(() => {
        unsubscribe();
        setIsLoading(false);
      }, 10000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <ProtectedPage pageName="AssistenteDipendente">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Assistente Sa Pizzedda</h1>
            <p className="text-sm text-slate-500">Chiedimi qualsiasi cosa sul lavoro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar conversazioni */}
          <div className="lg:col-span-1">
            <NeumorphicCard className="p-4">
              <button
                onClick={createNewConversation}
                className="w-full nav-button px-4 py-3 rounded-xl text-slate-700 font-medium flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-4 h-4" />
                Nuova Chat
              </button>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Nessuna conversazione</p>
                ) : (
                  conversations.slice(0, 10).map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        currentConversation?.id === conv.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {conv.metadata?.name || 'Chat'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {conv.messages?.length || 0} messaggi
                      </p>
                    </button>
                  ))
                )}
              </div>
            </NeumorphicCard>
          </div>

          {/* Chat principale */}
          <div className="lg:col-span-3">
            <NeumorphicCard className="p-4 h-[600px] flex flex-col">
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="w-16 h-16 mb-4" />
                    <p className="text-center">
                      Ciao! Sono l'assistente di Sa Pizzedda.<br />
                      Come posso aiutarti oggi?
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="text-sm">{msg.content}</p>
                        ) : (
                          <div className="text-sm prose prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-sm text-slate-500">Sto pensando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="nav-button px-4 py-3 rounded-xl text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
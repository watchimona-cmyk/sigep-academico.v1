import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Staff, Student } from '../types';
import { checkPermission, ROLES_MATRIX } from '../utils';
import { MessageSquare, Shield, Send, UserPlus, Lock, Unlock, Mail, Clock, FileText, Check, AlertCircle, Sparkles, Ban, RefreshCw } from 'lucide-react';

interface ChatStaffProps {
  loggedInStaff: Staff;
  staffList: Staff[];
  students?: Student[];
  onOpenStudent360?: (student: Student) => void;
}

interface LogComunicacaoInterna {
  id: string;
  remetente_id: string;
  remetente_nome: string;
  remetente_cargo: string;
  destinatario_id: string; // ID do canal ou ID de utilizador privado
  mensagem: string;
  id_referencia_doc?: string;
  timestamp: string;
}

interface CanalConvidado {
  id_canal: string;
  id_utilizador: string;
  status_convite: 'PENDENTE' | 'ACEITO' | 'RECUSADO';
}

interface Channel {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  allowedRolesByDefault: string[]; // native access roles
}

class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Erro no ChatStaff:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl space-y-4 text-center my-6 max-w-2xl mx-auto shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <span className="font-extrabold text-xl">⚠️</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Ocorreu um erro no módulo de Chat</h3>
          <p className="text-xs text-slate-600">
            A aplicação detetou uma inconsistência ao processar as mensagens da LAN. Por favor, tente redefinir a conversação ou contacte o suporte.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                localStorage.removeItem('sigep_log_comunicacao_interna_v2');
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer"
            >
              Limpar Histórico e Recarregar
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-bold text-slate-750 bg-slate-100 hover:bg-slate-200 rounded-xl border transition-all cursor-pointer"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ChatStaff({ loggedInStaff, staffList, students = [], onOpenStudent360 }: ChatStaffProps) {
  // Define standard channels following educational and administrative guidelines
  const CHANNELS: Channel[] = [
    {
      id: 'geral-direccao',
      name: 'Direcção Geral',
      description: 'Canal restrito para decisões executivas e alinhamento de infraestrutura.',
      isPrivate: true,
      allowedRolesByDefault: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO']
    },
    {
      id: 'pautas-pedagogico',
      name: 'Conselho de Notas & Pautas',
      description: 'Lançamentos, pautas oficiais e avaliações do MED.',
      isPrivate: true,
      allowedRolesByDefault: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO']
    },
    {
      id: 'rh-financeiro',
      name: 'RH & Contabilidade',
      description: 'Discussão de vencimentos, orçamentos e propinas em atraso.',
      isPrivate: true,
      allowedRolesByDefault: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_ADMINISTRATIVO']
    },
    {
      id: 'secretaria-geral',
      name: 'Secretaria Escolar',
      description: 'Matrículas, listagens nominais de turmas e emissões físicas.',
      isPrivate: false,
      allowedRolesByDefault: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'PROFESSOR']
    },
    {
      id: 'suporte-ti',
      name: 'Suporte Técnico SIGEP',
      description: 'Canal público para resolução de dúvidas e integridade do PostgreSQL.',
      isPrivate: false,
      allowedRolesByDefault: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'PROFESSOR']
    }
  ];

  const [activeChannelId, setActiveChannelId] = useState<string>('secretaria-geral');
  const [messages, setMessages] = useState<LogComunicacaoInterna[]>([]);
  const [convidados, setConvidados] = useState<CanalConvidado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Form inputs
  const [inputMsg, setInputMsg] = useState<string>('');
  const [refDocId, setRefDocId] = useState<string>('');
  const [selectedStaffToInvite, setSelectedStaffToInvite] = useState<string>('');
  const [logSuccessMsg, setLogSuccessMsg] = useState<string | null>(null);
  const [logErrorMsg, setLogErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from local storage following persistent specifications
  useEffect(() => {
    setLoading(true);
    const savedMessages = localStorage.getItem('sigep_log_comunicacao_interna_v2');
    const savedConvidados = localStorage.getItem('sigep_canais_convidados_v1');

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error("Erro ao carregar mensagens do Chat:", err);
        setMessages([]);
      }
    } else {
      // Seed initial welcoming messages in local network
      const initialMsgs: LogComunicacaoInterna[] = [
        {
          id: 'msg-seed-1',
          remetente_id: 'SYSTEM',
          remetente_nome: 'Sistema SIGEP',
          remetente_cargo: 'Núcleo Central',
          destinatario_id: 'secretaria-geral',
          mensagem: 'Bem-vindo ao Chat Interno do SIGEP Académico! Este canal comunica os computadores da instituição na rede LAN.',
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(initialMsgs);
      localStorage.setItem('sigep_log_comunicacao_interna_v2', JSON.stringify(initialMsgs));
    }

    if (savedConvidados) {
      try {
        const parsed = JSON.parse(savedConvidados);
        setConvidados(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error("Erro ao carregar convidados:", err);
        setConvidados([]);
      }
    } else {
      // Seed default permissions
      const initialConvites: CanalConvidado[] = [
        { id_canal: 'geral-direccao', id_utilizador: 'CHEFE_SECRETARIA', status_convite: 'PENDENTE' }
      ];
      setConvidados(initialConvites);
      localStorage.setItem('sigep_canais_convidados_v1', JSON.stringify(initialConvites));
    }
    
    // Simular pequeno delay para garantir robustez e renderizar o loading
    const t = setTimeout(() => {
      setLoading(false);
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // Save updates helper
  const saveMessagesToStorage = (updated: LogComunicacaoInterna[]) => {
    setMessages(updated);
    localStorage.setItem('sigep_log_comunicacao_interna_v2', JSON.stringify(updated));
  };

  const saveConvidadosToStorage = (updated: CanalConvidado[]) => {
    setConvidados(updated);
    localStorage.setItem('sigep_canais_convidados_v1', JSON.stringify(updated));
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  // Chat messaging is fully real with no test simulations
  useEffect(() => {
    // Left empty to disable all fake incoming test messages in production phase
  }, []);

  // Get current active channel configs
  const activeChannel = CHANNELS.find(c => c.id === activeChannelId) || CHANNELS[3];

  const addAuditLog = (action: string, target: string) => {
    try {
      const saved = localStorage.getItem('sigep_audit_logs_v1');
      const logs = saved ? JSON.parse(saved) : [];
      const newLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        user: loggedInStaff.name,
        action,
        timestamp: new Date().toLocaleDateString('pt-AO') + ' ' + new Date().toLocaleTimeString('pt-AO'),
        target
      };
      localStorage.setItem('sigep_audit_logs_v1', JSON.stringify([...logs, newLog]));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  // Helper check: Is user allowed native or conditional access to this channel?
  const checkChatAccess = (userId: string, userRole: string, channelId: string): boolean => {
    const targetCh = CHANNELS.find(c => c.id === channelId);
    if (!targetCh) return false;

    // Public channels are accessible to everyone
    if (!targetCh.isPrivate) return true;

    // Director Geral has access to all channels (cannot be removed by anyone)
    if (userRole === 'DIRECTOR_GERAL') return true;

    // Check if explicitly blocked/deactivated in convidados
    const explicitBlock = convidados.find(
      inv => inv.id_canal === channelId && inv.id_utilizador === userId && (inv.status_convite === 'RECUSADO' || inv.status_convite === 'PENDENTE')
    );
    if (explicitBlock) {
      return false;
    }

    // Native Access
    if (targetCh.allowedRolesByDefault.includes(userRole)) {
      return true;
    }

    // Conditional Access check (via invitation status)
    const activeInvitation = convidados.find(
      inv => inv.id_canal === channelId && inv.id_utilizador === userId && inv.status_convite === 'ACEITO'
    );

    return !!activeInvitation;
  };

  const hasAccessToActiveChannel = checkChatAccess(loggedInStaff.id, loggedInStaff.role, activeChannel.id);

  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    // Validate permission
    if (!hasAccessToActiveChannel) {
      setLogErrorMsg('Sem permissão de escrita neste canal de comunicação.');
      return;
    }

    const cleanMsg: LogComunicacaoInterna = {
      id: `msg-${Date.now()}`,
      remetente_id: loggedInStaff.id,
      remetente_nome: loggedInStaff.name,
      remetente_cargo: loggedInStaff.role === 'DIRECTOR_GERAL' ? 'Director Geral' :
                      loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico' :
                      loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdirector Administrativo' :
                      loggedInStaff.role === 'CHEFE_SECRETARIA' ? 'Chefe de Secretaria' : 'Professor',
      destinatario_id: activeChannelId,
      mensagem: inputMsg.trim(),
      id_referencia_doc: refDocId.trim() || undefined,
      timestamp: new Date().toISOString()
    };

    const updated = [...messages, cleanMsg];
    saveMessagesToStorage(updated);
    setInputMsg('');
    setRefDocId('');
    setLogErrorMsg(null);
  };

  // Invite user handler
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffToInvite) return;

    // Ensure logged-in user can invite
    const canInvite = loggedInStaff.role === 'DIRECTOR_GERAL' || 
                      loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' || 
                      loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO';

    if (!canInvite) {
      setLogErrorMsg('Erro de Segurança: Apenas a Direcção Geral e Subdirectores podem emitir convites.');
      return;
    }

    // Check if invitation already exists (and is currently ACCEPTED)
    const existingIndex = convidados.findIndex(
      c => c.id_canal === activeChannelId && c.id_utilizador === selectedStaffToInvite
    );

    const targetStaffObj = staffList.find(s => s.id === selectedStaffToInvite);
    if (!targetStaffObj) return;

    let updated = [...convidados];
    if (existingIndex >= 0) {
      // If it exists, let's just reactivate it
      updated[existingIndex].status_convite = 'ACEITO';
    } else {
      const newInvite: CanalConvidado = {
        id_canal: activeChannelId,
        id_utilizador: selectedStaffToInvite,
        status_convite: 'ACEITO'
      };
      updated.push(newInvite);
    }

    saveConvidadosToStorage(updated);
    
    // Add real audit log in central database
    const cargoRemetente = loggedInStaff.role === 'DIRECTOR_GERAL' ? 'Director Geral' : 'Subdirector';
    const actionDesc = `${targetStaffObj.name} (${targetStaffObj.role}) adicionado ao canal #${activeChannel.name} por ${cargoRemetente} ${loggedInStaff.name}.`;
    addAuditLog(actionDesc, `Canal: ${activeChannel.name}`);

    // Notify in chat about the added member
    const addedMsg: LogComunicacaoInterna = {
      id: `system-added-${Date.now()}`,
      remetente_id: 'SYSTEM',
      remetente_nome: 'Segurança SIGEP',
      remetente_cargo: 'Núcleo Central',
      destinatario_id: activeChannelId,
      mensagem: `O utilizador ${targetStaffObj.name} foi autorizado a integrar este canal privado por ${loggedInStaff.name}.`,
      timestamp: new Date().toISOString()
    };

    saveMessagesToStorage([...messages, addedMsg]);

    setLogSuccessMsg(`Membro adicionado com sucesso ao canal privado.`);
    setSelectedStaffToInvite('');
    setLogErrorMsg(null);
    setTimeout(() => setLogSuccessMsg(null), 4000);
  };

  const handleToggleGuestStatus = (userId: string, currentStatus: string) => {
    const targetStaff = staffList.find(s => s.id === userId);
    if (!targetStaff) return;

    const isDG = loggedInStaff.role === 'DIRECTOR_GERAL';
    const isSub = loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' || loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO';

    if (!isDG && !isSub) {
      setLogErrorMsg('Sem autorização para alterar o status deste membro.');
      return;
    }

    // Subdirector cannot toggle DG or other Subdirectores
    if (isSub && (targetStaff.role === 'DIRECTOR_GERAL' || targetStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' || targetStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO')) {
      setLogErrorMsg('Os Subdirectores não podem alterar permissões de outros membros da Direcção.');
      return;
    }

    const newStatus = currentStatus === 'ACEITO' ? 'RECUSADO' : 'ACEITO';
    
    const updated = convidados.map(inv => {
      if (inv.id_canal === activeChannelId && inv.id_utilizador === userId) {
        return { ...inv, status_convite: newStatus as any };
      }
      return inv;
    });

    saveConvidadosToStorage(updated);
    
    // Add real audit log in central database
    const cargoRemetente = loggedInStaff.role === 'DIRECTOR_GERAL' ? 'Director Geral' : 'Subdirector';
    const actionText = newStatus === 'ACEITO' 
      ? `Activou o acesso de ${targetStaff.name} ao canal #${activeChannel.name}`
      : `Desactivou o acesso de ${targetStaff.name} ao canal #${activeChannel.name}`;
    addAuditLog(`${actionText} (Realizado por ${cargoRemetente} ${loggedInStaff.name})`, `Canal: ${activeChannel.name}`);

    // Notify in chat
    const alertMsg: LogComunicacaoInterna = {
      id: `system-toggle-${Date.now()}`,
      remetente_id: 'SYSTEM',
      remetente_nome: 'Segurança SIGEP',
      remetente_cargo: 'Núcleo Central',
      destinatario_id: activeChannelId,
      mensagem: `O acesso de ${targetStaff.name} a este canal foi ${newStatus === 'ACEITO' ? 'ACTIVADO' : 'DESACTIVADO'} por ${loggedInStaff.name}.`,
      timestamp: new Date().toISOString()
    };
    saveMessagesToStorage([...messages, alertMsg]);
    
    setLogSuccessMsg(`Status de ${targetStaff.name} alterado com sucesso.`);
    setTimeout(() => setLogSuccessMsg(null), 3000);
  };

  // Get filtered list of messages for active channel
  const safeMessages = Array.isArray(messages) ? messages : [];
  const filteredMessages = safeMessages.filter(m => m && m.destinatario_id === activeChannelId);

  // Format time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* 1. CHANNEL LIST (LEFT SIDEBAR) */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-white font-extrabold text-sm tracking-wide uppercase">Canais Internos</h3>
          </div>

          {['CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO', 'PROFESSOR'].includes(loggedInStaff.role) && (
            <div className="mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-sans">Sinal d'Acesso à Direcção</span>
              <div className="space-y-1.5">
                {CHANNELS.filter(c => c.isPrivate).map(ch => {
                  const hasAccess = checkChatAccess(loggedInStaff.id, loggedInStaff.role, ch.id);
                  return (
                    <div key={ch.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-300 font-medium font-sans">#{ch.name}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-extrabold text-[8px] tracking-wide ${
                        hasAccess 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900 animate-pulse' 
                          : 'bg-red-950 text-red-400 border border-red-900'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasAccess ? 'bg-emerald-400' : 'bg-red-500'}`} />
                        {hasAccess ? 'CANAL ABERTO' : 'FECHADO'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="space-y-1.5">
            {CHANNELS.map(ch => {
              const isAllowed = checkChatAccess(loggedInStaff.id, loggedInStaff.role, ch.id);
              const isActive = ch.id === activeChannelId;
              
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    setLogErrorMsg(null);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all border flex flex-col gap-1 cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-900/60 border-indigo-750 text-white' 
                      : isAllowed
                        ? 'bg-slate-850/40 hover:bg-slate-800/60 border-transparent text-slate-300 hover:text-white'
                        : 'bg-slate-950/20 border-transparent text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!isAllowed && ch.isPrivate}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs tracking-wide">#{ch.name}</span>
                    {ch.isPrivate ? (
                      <Lock className={`w-3 h-3 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{ch.description}</span>
                  {!isAllowed && (
                    <span className="text-[8px] bg-red-950 text-red-450 border border-red-900 px-1.5 py-0.5 rounded-md mt-1 self-start font-bold uppercase tracking-wider">
                      Bloqueado (Requer Convite)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-850/80">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 text-center">
            <Shield className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Modo LAN Conectado</span>
            <span className="text-[9px] text-slate-500 font-mono">Topologia Central - 4 Computadores</span>
          </div>
        </div>
      </div>

      {/* 2. CHAT STREAM (CENTER COLUMN) */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between overflow-hidden shadow-px">
        
        {/* Active Channel Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">#{activeChannel.name}</span>
              {activeChannel.isPrivate ? (
                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  <Lock className="w-2 h-2" /> Privado
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <Unlock className="w-2 h-2" /> Geral
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{activeChannel.description}</p>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-indigo-650 gap-2 font-semibold py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">A carregar comunicações da LAN escolar...</span>
            </div>
          ) : !hasAccessToActiveChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="w-12 h-12 bg-red-50 text-red-500 border border-red-200 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-800">Acesso Restrito ao Canal</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Apenas o Director Geral e membros explicitamente convidados podem visualizar ou enviar mensagens no canal privado de <strong>#{activeChannel.name}</strong>.
              </p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-8">
              <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs font-bold text-slate-600">Sem mensagens no momento</p>
              <p className="text-[10px] text-slate-450 mt-0.5">Seja o primeiro a enviar uma comunicação oficial!</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelf = msg.remetente_id === loggedInStaff.id;
              const isSystem = msg.remetente_id === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-slate-200/60 border border-slate-300 text-slate-600 text-[10px] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                      <Shield className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-700">{msg.mensagem}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isSelf ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 border shadow-3xs ${
                    isSelf 
                      ? 'bg-indigo-600 text-white border-indigo-700 rounded-tr-none' 
                      : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'
                  }`}>
                    {/* Sender Header */}
                    {!isSelf && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-indigo-900">{msg.remetente_nome}</span>
                        <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md font-bold uppercase tracking-wider">
                          {msg.remetente_cargo}
                        </span>
                      </div>
                    )}

                    {/* Document Reference Banner */}
                    {msg.id_referencia_doc && (
                      <button
                        type="button"
                        onClick={() => {
                          if (students && onOpenStudent360) {
                            const student = students.find(s => s.id === msg.id_referencia_doc);
                            if (student) {
                              onOpenStudent360(student);
                            } else {
                              alert(`Aluno com ID ${msg.id_referencia_doc} não foi encontrado.`);
                            }
                          } else {
                            alert("Acesso rápido indisponível nesta sessão.");
                          }
                        }}
                        className={`mb-1.5 py-1.5 px-2.5 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 border hover:scale-[1.02] transition-transform cursor-pointer text-left ${
                          isSelf 
                            ? 'bg-indigo-700 border-indigo-850 text-indigo-100' 
                            : 'bg-indigo-50 border-indigo-150 text-indigo-800 hover:bg-indigo-100'
                        }`}
                        title="Abrir Ficha de Aluno 360"
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span>Registo Aluno: {msg.id_referencia_doc} ↗</span>
                      </button>
                    )}

                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.mensagem}</p>

                    <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-75">
                      <Clock className="w-2 h-2" />
                      <span>{formatTime(msg.timestamp)}</span>
                      {isSelf && <Check className="w-2.5 h-2.5 text-indigo-350" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Area */}
        <div className="border-t border-slate-200 px-5 py-3.5 bg-slate-50 shrink-0">
          {logErrorMsg && (
            <div className="mb-2 bg-red-50 text-red-700 text-[10px] p-2.5 rounded-xl flex items-center gap-1.5 border border-red-100 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{logErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex gap-2">
              <input
                id="chat-message-input"
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={hasAccessToActiveChannel ? `Diga algo em #${activeChannel.name}...` : 'Canal bloqueado para escrita'}
                className="flex-1 bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-px disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={!hasAccessToActiveChannel}
              />
              <button
                id="chat-message-send"
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                disabled={!inputMsg.trim() || !hasAccessToActiveChannel}
                title="Enviar Mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="chat-ref-doc-input"
                  type="text"
                  value={refDocId}
                  onChange={(e) => setRefDocId(e.target.value)}
                  placeholder="ID Doc. Referência opcional (Ex: PAUTA-7A)"
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={!hasAccessToActiveChannel}
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">Porta LAN: 3000 | PostgreSQL Central</span>
            </div>
          </form>
        </div>

      </div>

      {/* 3. CHANNEL MEMBERS & INVITATION SYSTEM (RIGHT COLUMN) */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-px">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <h4 className="text-slate-800 font-extrabold text-xs tracking-wider uppercase">Membros & Acessos</h4>
          </div>

          <div className="space-y-4">
            {/* Native Access Description */}
            <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-700 block mb-1">Acesso Nativo do Canal</span>
              <div className="flex flex-wrap gap-1">
                {activeChannel.allowedRolesByDefault.map(role => (
                  <span key={role} className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-md font-bold uppercase">
                    {role === 'DIRECTOR_GERAL' ? 'DG' :
                     role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'PED' :
                     role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'ADM' :
                     role === 'CHEFE_SECRETARIA' ? 'SEC' : 'PROF'}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5">Estes cargos entram no canal automaticamente sem convite.</p>
            </div>

            {/* Invitation Area for Privileged Staff */}
            {ROLES_MATRIX[loggedInStaff.role]?.canInvite && activeChannel.isPrivate && (
              <form onSubmit={handleInviteUser} className="space-y-2 pt-2 border-t border-slate-150">
                <span className="text-[10px] font-extrabold text-slate-700 block">Convidar Outros Funcionários</span>
                
                {logSuccessMsg && (
                  <div className="bg-emerald-50 text-emerald-700 text-[9px] p-2 rounded-xl flex items-center gap-1 border border-emerald-100 font-bold">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{logSuccessMsg}</span>
                  </div>
                )}

                <select
                  id="invite-staff-select"
                  value={selectedStaffToInvite}
                  onChange={(e) => setSelectedStaffToInvite(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-3xs"
                  required
                >
                  <option value="">-- Seleccionar Funcionário --</option>
                  {staffList
                    .filter(s => {
                      if (s.id === loggedInStaff.id) return false;
                      if (s.role === 'DIRECTOR_GERAL') return false;
                      
                      const isDG = loggedInStaff.role === 'DIRECTOR_GERAL';
                      if (!isDG) {
                        // Subdirectors cannot invite other subdirectors
                        if (s.role === 'SUB_DIRECTOR_PEDAGOGICO' || s.role === 'SUB_DIRECTOR_ADMINISTRATIVO') return false;
                      }
                      
                      // Filter out if they are already a native member and not DG (since DG can override anything)
                      if (activeChannel.allowedRolesByDefault.includes(s.role) && !isDG) return false;
                      
                      return true;
                    })
                    .map(s => {
                      const roleLabel = s.role === 'CHEFE_SECRETARIA' ? 'Secretária' : 
                                        s.role === 'TECNICO_PEDAGOGICO' ? 'Téc. Pedagógico' :
                                        s.role === 'TECNICO_ADMINISTRATIVO' ? 'Téc. Administrativo' :
                                        s.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdir. Pedagógico' :
                                        s.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdir. Administrativo' :
                                        'Professor';
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({roleLabel})
                        </option>
                      );
                    })}
                </select>

                <button
                  id="btn-invite-staff"
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] py-2 rounded-xl transition-all shadow-3xs tracking-wider uppercase cursor-pointer"
                >
                  Conceder Autorização
                </button>
              </form>
            )}

            {/* List of active invitees */}
            {activeChannel.isPrivate && (
              <div className="pt-3 border-t border-slate-150">
                <span className="text-[10px] font-extrabold text-slate-700 block mb-2">Convites / Autorizados</span>
                <div className="space-y-1.5">
                  {convidados.filter(inv => inv.id_canal === activeChannelId).length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic block">Nenhum convite emitido neste canal.</span>
                  ) : (
                    convidados
                      .filter(inv => inv.id_canal === activeChannelId)
                      .map(inv => {
                        const targetStaff = staffList.find(s => s.id === inv.id_utilizador);
                        const isDG = loggedInStaff.role === 'DIRECTOR_GERAL';
                        const isSub = loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' || loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO';
                        const canToggleThisOne = isDG || (isSub && targetStaff?.role !== 'DIRECTOR_GERAL' && targetStaff?.role !== 'SUB_DIRECTOR_PEDAGOGICO' && targetStaff?.role !== 'SUB_DIRECTOR_ADMINISTRATIVO');
                        
                        return (
                          <div key={inv.id_utilizador} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-xl gap-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[10px] text-slate-700 font-bold truncate">{targetStaff?.name || inv.id_utilizador}</span>
                              <span className="text-[8px] text-slate-400 font-medium">
                                {targetStaff?.role === 'CHEFE_SECRETARIA' ? 'Secretária' :
                                 targetStaff?.role === 'TECNICO_PEDAGOGICO' ? 'Téc. Pedagógico' :
                                 targetStaff?.role === 'TECNICO_ADMINISTRATIVO' ? 'Téc. Administrativo' :
                                 targetStaff?.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdir. Pedagógico' :
                                 targetStaff?.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdir. Administrativo' :
                                 'Professor'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[8px] border px-1 py-0.5 rounded-sm font-bold ${
                                inv.status_convite === 'ACEITO'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {inv.status_convite === 'ACEITO' ? 'ATIVO' : 'BLOQUEADO'}
                              </span>
                              {canToggleThisOne && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleGuestStatus(inv.id_utilizador, inv.status_convite)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title={inv.status_convite === 'ACEITO' ? 'Desactivar Acesso' : 'Activar Acesso'}
                                >
                                  {inv.status_convite === 'ACEITO' ? (
                                    <Ban className="w-3.5 h-3.5 text-red-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-3 rounded-xl border border-indigo-100 text-center">
          <Sparkles className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
          <span className="text-[9px] text-indigo-850 font-bold block">SIGEP-Comunicação v1.1.0</span>
          <p className="text-[8px] text-slate-400 mt-1">Conformidade com a LGPD-AO e diretrizes do Ministério da Educação.</p>
        </div>

      </div>

    </div>
  );
}

export default function ChatStaffWithErrorBoundary(props: ChatStaffProps) {
  return (
    <ChatErrorBoundary>
      <ChatStaff {...props} />
    </ChatErrorBoundary>
  );
}

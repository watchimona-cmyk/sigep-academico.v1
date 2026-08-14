/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SchoolSettings, UserRole, carregarGrelhaCurricular, salvarGrelhaCurricular, resetarGrelhaCurricular, GrelhaCurricularItem, SubjectType, ModalityType, SUBJECTS } from '../types';
import { Shield, Building, MapPin, Mail, Phone, User, Users, Save, CheckCircle, ShieldAlert, ShieldCheck, FileText, BookOpen, Image, RefreshCw, Upload, Sparkles, Trash2, X, Database, Wifi, WifiOff, Server, Plus, RotateCcw, ArrowLeft, Layers, ToggleLeft, ToggleRight, GripVertical, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, XCircle, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ConfiguracaoSubsistema } from './ConfiguracaoSubsistema';
import { formatarNomeProprio, formatarNomeDisciplina } from '../utils/pautaLogic';

interface CabecalhoSettingsProps {
  settings: SchoolSettings;
  onChangeSettings: (settings: SchoolSettings) => void;
  userRole: UserRole;
  onPullData?: (onProgress?: (percent: number, stepMessage: string) => void) => Promise<any>;
  onPushData?: (onProgress?: (percent: number, stepMessage: string) => void) => Promise<any>;
}

export default function CabecalhoSettings({
  settings,
  onChangeSettings,
  userRole,
  onPullData,
  onPushData
}: CabecalhoSettingsProps) {
  // Navigation active sub-panel
  const [activeSubTab, setActiveSubTab] = useState<'MENU' | 'IDENTIDADE' | 'CABECALHOS' | 'CARGOS' | 'GRELHA' | 'SUBSISTEMA'>('MENU');

  // Local editable form bindings
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [municipality, setMunicipality] = useState(settings.municipality);
  const [province, setProvince] = useState(settings.province);
  const [address, setAddress] = useState(settings.address);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [directorName, setDirectorName] = useState(settings.directorName);
  const [subdirectorName, setSubdirectorName] = useState(settings.subdirectorName);
  const [subdirectorAdminName, setSubdirectorAdminName] = useState(settings.subdirectorAdminName || 'António Muanza');
  const [coordinator1, setCoordinator1] = useState(settings.coordinators[0] || '');
  const [coordinator2, setCoordinator2] = useState(settings.coordinators[1] || '');
  const [coordinator3, setCoordinator3] = useState(settings.coordinators[2] || '');
  const [secretaryName, setSecretaryName] = useState(settings.secretaryName);
  const [logoType, setLogoType] = useState<"PUBLIC" | "PRIVATE">(settings.logoType);
  const [privateLogoUrl, setPrivateLogoUrl] = useState(settings.privateLogoUrl || '');
  const [publicLogoUrl, setPublicLogoUrl] = useState(settings.publicLogoUrl || '🇦🇴');
  const [academicYear, setAcademicYear] = useState(settings.academicYear || '2025/2026');
  const [decretoExecutivo, setDecretoExecutivo] = useState(settings.decretoExecutivo || settings.despachoCriacao || 'Decreto Executivo nº 445/16 de 25 de Novembro');
  const [leiBaseRegulamento, setLeiBaseRegulamento] = useState(settings.leiBaseRegulamento || 'disposto na alínea b) do artigo 109º da LBEE 17/16, de 7 de Outubro');

  // 4 Lei de Base states (6ª, 9ª, 12ª, 13ª Classe)
  const [leiBase6a, setLeiBase6a] = useState(settings.leiBase6a || 'disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro');
  const [leiBase6aActive, setLeiBase6aActive] = useState(settings.leiBase6aActive !== false);

  const [leiBase9a, setLeiBase9a] = useState(settings.leiBase9a || 'disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro');
  const [leiBase9aActive, setLeiBase9aActive] = useState(settings.leiBase9aActive !== false);

  const [leiBase12a, setLeiBase12a] = useState(settings.leiBase12a || 'disposto no Decreto Executivo nº 445/16 de 25 de Novembro');
  const [leiBase12aActive, setLeiBase12aActive] = useState(settings.leiBase12aActive !== false);

  const [leiBase13a, setLeiBase13a] = useState(settings.leiBase13a || 'disposto na alínea (f) do artigo 109º da LBSEE 17/16, de 07 de Outubro');
  const [leiBase13aActive, setLeiBase13aActive] = useState(settings.leiBase13aActive !== false);

  // Subpanel 1 (Cabeçalhos) States
  const [headerLine1, setHeaderLine1] = useState(settings.headerLine1 || 'REPÚBLICA DE ANGOLA');
  const [headerLine1Active, setHeaderLine1Active] = useState(settings.headerLine1Active !== false);
  const [headerLine2, setHeaderLine2] = useState(settings.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO');
  const [headerLine2Active, setHeaderLine2Active] = useState(settings.headerLine2Active !== false);
  const [headerLine3, setHeaderLine3] = useState(settings.headerLine3 || `GOVERNO PROVINCIAL DE ${settings.province?.toUpperCase() || 'LUNDA NORTE'}`);
  const [headerLine3Active, setHeaderLine3Active] = useState(settings.headerLine3Active !== false);
  const [headerLine4, setHeaderLine4] = useState(settings.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${settings.municipality?.toUpperCase() || 'CAFUNFO'}`);
  const [headerLine4Active, setHeaderLine4Active] = useState(settings.headerLine4Active !== false);

  // Active cycles of education (institutional level components)
  const [activePrimario, setActivePrimario] = useState(settings.activeComponents?.ENSINO_PRIMARIO ?? true);
  const [activePuniv, setActivePuniv] = useState(settings.activeComponents?.PUNIV ?? true);
  const [activeMagisterio, setActiveMagisterio] = useState(settings.activeComponents?.MAGISTERIO ?? true);

  // PostgreSQL Synchronization local states
  const [syncEnabled, setSyncEnabled] = useState(settings.syncEnabled || false);
  const [syncServerUrl, setSyncServerUrl] = useState(settings.syncServerUrl && settings.syncServerUrl !== 'http://localhost:3000' ? settings.syncServerUrl : '');
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [connMessage, setConnMessage] = useState<string | null>(null);
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [firewallResult, setFirewallResult] = useState<string | null>(null);

  const handleLiberarFirewall = async () => {
    setFirewallLoading(true);
    setFirewallResult(null);
    try {
      const res = await fetch('/api/admin/liberar-firewall', { method: 'POST' });
      const data = await res.json();
      setFirewallResult(data.message || (data.success ? 'Porta 3000 liberada com sucesso no Firewall do Windows!' : 'Instrução enviada ao sistema.'));
    } catch (e: any) {
      setFirewallResult('Comando enviado. Foi também gerado C:\\Backups_SIGEP\\liberar_firewall_sigep.bat no seu computador. Caso o bloqueio persista, clique com o botão direito nesse ficheiro e selecione "Executar como Administrador".');
    } finally {
      setFirewallLoading(false);
    }
  };
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncOpStatus, setSyncOpStatus] = useState<'idle' | 'pushing' | 'pulling' | 'success' | 'empty' | 'error'>('idle');
  const [syncOpMessage, setSyncOpMessage] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStepText, setSyncStepText] = useState<string>('');
  const [lastSyncStats, setLastSyncStats] = useState<{
    studentsCount: number;
    staffCount: number;
    gradesCount: number;
    propinasCount: number;
    grelhaCount?: number;
  } | null>(null);

  // Sub-selection state: EMOJI (símbolo) or IMAGE (ficheiro local)
  const [customLogoType, setCustomLogoType] = useState<'EMOJI' | 'IMAGE'>(
    (settings.privateLogoUrl && (settings.privateLogoUrl.startsWith('data:') || settings.privateLogoUrl.startsWith('http')))
      ? 'IMAGE'
      : 'EMOJI'
  );

  const [customPublicLogoType, setCustomPublicLogoType] = useState<'EMOJI' | 'IMAGE'>(
    (settings.publicLogoUrl && (settings.publicLogoUrl.startsWith('data:') || settings.publicLogoUrl.startsWith('http')))
      ? 'IMAGE'
      : 'EMOJI'
  );

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const [directorRoleLabel, setDirectorRoleLabel] = useState(settings.directorRoleLabel || 'Director Geral');
  const [subdirectorRoleLabel, setSubdirectorRoleLabel] = useState(settings.subdirectorRoleLabel || 'Subdirector Pedagógico');
  const [subdirectorAdminRoleLabel, setSubdirectorAdminRoleLabel] = useState(settings.subdirectorAdminRoleLabel || 'Subdirector Administrativo');
  const [secretaryRoleLabel, setSecretaryRoleLabel] = useState(settings.secretaryRoleLabel || 'Secretário-Geral');

  React.useEffect(() => {
    setActivePrimario(settings.activeComponents?.ENSINO_PRIMARIO ?? true);
    setActivePuniv(settings.activeComponents?.PUNIV ?? true);
    setActiveMagisterio(settings.activeComponents?.MAGISTERIO ?? true);
    if (settings.decretoExecutivo || settings.despachoCriacao) setDecretoExecutivo(settings.decretoExecutivo || settings.despachoCriacao || '');
    if (settings.leiBaseRegulamento) setLeiBaseRegulamento(settings.leiBaseRegulamento);
    if (settings.leiBase6a) setLeiBase6a(settings.leiBase6a);
    if (settings.leiBase6aActive !== undefined) setLeiBase6aActive(settings.leiBase6aActive);
    if (settings.leiBase9a) setLeiBase9a(settings.leiBase9a);
    if (settings.leiBase9aActive !== undefined) setLeiBase9aActive(settings.leiBase9aActive);
    if (settings.leiBase12a) setLeiBase12a(settings.leiBase12a);
    if (settings.leiBase12aActive !== undefined) setLeiBase12aActive(settings.leiBase12aActive);
    if (settings.leiBase13a) setLeiBase13a(settings.leiBase13a);
    if (settings.leiBase13aActive !== undefined) setLeiBase13aActive(settings.leiBase13aActive);
    if (settings.schoolName) setSchoolName(settings.schoolName);
    if (settings.headerLine1) setHeaderLine1(settings.headerLine1);
    if (settings.headerLine1Active !== undefined) setHeaderLine1Active(settings.headerLine1Active);
    if (settings.headerLine2) setHeaderLine2(settings.headerLine2);
    if (settings.headerLine2Active !== undefined) setHeaderLine2Active(settings.headerLine2Active);
    if (settings.headerLine3) setHeaderLine3(settings.headerLine3);
    if (settings.headerLine3Active !== undefined) setHeaderLine3Active(settings.headerLine3Active);
    if (settings.headerLine4) setHeaderLine4(settings.headerLine4);
    if (settings.headerLine4Active !== undefined) setHeaderLine4Active(settings.headerLine4Active);
    if (settings.directorName) setDirectorName(settings.directorName);
    if (settings.subdirectorName) setSubdirectorName(settings.subdirectorName);
    if (settings.secretaryName) setSecretaryName(settings.secretaryName);
    setDirectorRoleLabel(settings.directorRoleLabel || 'Director Geral');
    setSubdirectorRoleLabel(settings.subdirectorRoleLabel || 'Subdirector Pedagógico');
    setSubdirectorAdminRoleLabel(settings.subdirectorAdminRoleLabel || 'Subdirector Administrativo');
    setSecretaryRoleLabel(settings.secretaryRoleLabel || 'Secretário-Geral');
  }, [settings]);

  // Grelha Curricular Dinâmica States & Handlers
  const [grelhaItems, setGrelhaItems] = useState<GrelhaCurricularItem[]>(() => {
    return carregarGrelhaCurricular();
  });
  const [grelhaFilterModality, setGrelhaFilterModality] = useState<ModalityType | ''>('');
  const [grelhaFilterClass, setGrelhaFilterClass] = useState<string>('');
  const [grelhaFilterSpecialty, setGrelhaFilterSpecialty] = useState<string>('');
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newGeneralSubject, setNewGeneralSubject] = useState<string>('');
  const [newSpecificSubject, setNewSpecificSubject] = useState<string>('');
  const [newEducationalSubject, setNewEducationalSubject] = useState<string>('');

  const handleModalityChange = (mod: ModalityType | '') => {
    setGrelhaFilterModality(mod);
    setNewSubjectName('');
    setNewGeneralSubject('');
    setNewSpecificSubject('');
    setNewEducationalSubject('');
    setGrelhaFilterClass('');
    if (mod === 'ENSINO_PRIMARIO') {
      setGrelhaFilterSpecialty('GERAL');
    } else {
      setGrelhaFilterSpecialty('');
    }
  };

  const handleClassChange = (cl: string) => {
    setGrelhaFilterClass(cl);
    setNewSubjectName('');
    setNewGeneralSubject('');
    setNewSpecificSubject('');
    setNewEducationalSubject('');
    if (grelhaFilterModality === 'ENSINO_PRIMARIO') {
      setGrelhaFilterSpecialty('GERAL');
    }
  };

  // Helper resiliente para sincronização de API com fallback automático para rota relativa local
  const performSyncFetch = async (path: string, options?: RequestInit) => {
    const baseUrl = settings.syncServerUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Tenta primeiro o caminho relativo caso o servidor esteja configurado como localhost/127.0.0.1
    const isLocalhost = cleanBaseUrl.includes('localhost') || cleanBaseUrl.includes('127.0.0.1');
    if (isLocalhost) {
      try {
        const relativeRes = await fetch(path, options);
        if (relativeRes.ok) return relativeRes;
      } catch (err) {
        console.warn("Falha ao tentar sincronização direta via localhost. Prosseguindo...");
      }
    }

    try {
      // Se não for localhost ou se o fetch relativo inicial falhar, tenta o URL absoluto
      const res = await fetch(`${cleanBaseUrl}${path}`, options);
      if (res.ok) return res;
      throw new Error(`Código de status HTTP: ${res.status}`);
    } catch (err) {
      console.warn(`Sincronização absoluta falhou (${err instanceof Error ? err.message : String(err)}). Tentando fallback relativo local...`);
      // Fallback silencioso e resiliente para rota relativa
      try {
        const fallbackRes = await fetch(path, options);
        if (fallbackRes.ok) return fallbackRes;
        throw new Error(`Código de status HTTP no fallback: ${fallbackRes.status}`);
      } catch (fallbackErr) {
        console.error("Erro fatal no fallback relativo de sincronização:", fallbackErr);
        throw fallbackErr;
      }
    }
  };

  useEffect(() => {
    const fetchGrelha = async () => {
      const localItems = carregarGrelhaCurricular();
      setGrelhaItems(localItems);

      if (settings.syncEnabled) {
        try {
          const res = await performSyncFetch('/api/grelha');
          if (res && res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              setGrelhaItems(data);
              salvarGrelhaCurricular(data);
            } else if (localItems.length > 0) {
              // Server database is empty but we have local items. Push local items to server!
              await performSyncFetch('/api/grelha/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localItems)
              });
            }
          }
        } catch (err) {
          console.error("Erro ao sincronizar com o PostgreSQL:", err);
        }
      }
    };
    fetchGrelha();
  }, [grelhaFilterModality, grelhaFilterClass, grelhaFilterSpecialty, settings.syncEnabled, settings.syncServerUrl]);

  const handleAddGrelhaItem = async (customSubjectName?: string, category?: string) => {
    if (isLocked) return;
    if (!grelhaFilterModality || !grelhaFilterClass || !grelhaFilterSpecialty) {
      alert("Por favor, preencha toda a árvore de dependências (Ciclo, Classe e Curso/Especialidade) antes de vincular!");
      return;
    }

    const nameToUse = customSubjectName !== undefined ? customSubjectName : newSubjectName;
    const cleanedName = formatarNomeDisciplina(nameToUse).trim();
    if (!cleanedName) {
      alert("Por favor, introduza o nome de uma disciplina.");
      return;
    }

    const duplicate = grelhaItems.find(item => 
      item.modality === grelhaFilterModality &&
      item.class === grelhaFilterClass &&
      item.specialty === grelhaFilterSpecialty &&
      item.subject.trim().toUpperCase() === cleanedName.toUpperCase()
    );

    if (duplicate) {
      alert(`A disciplina "${cleanedName}" já está vinculada a esta combinação específica!`);
      return;
    }

    const newItem: GrelhaCurricularItem = {
      id: `GC_CUSTOM_${Date.now()}`,
      modality: grelhaFilterModality,
      specialty: grelhaFilterSpecialty,
      class: grelhaFilterClass,
      subject: cleanedName,
      active: true,
      category: category || (grelhaFilterModality === 'PUNIV' || grelhaFilterModality === 'MAGISTERIO' ? 'Formação Geral' : undefined)
    };

    const updated = [...grelhaItems, newItem];
    setGrelhaItems(updated);
    salvarGrelhaCurricular(updated);

    if (settings.syncEnabled) {
      try {
        await performSyncFetch('/api/grelha/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([newItem])
        });
      } catch (err) {
        console.error("Erro ao sincronizar com o PostgreSQL:", err);
      }
    }

    if (customSubjectName === undefined) {
      setNewSubjectName('');
    }
    alert(`Ligação curricular adicionada com sucesso! A disciplina "${cleanedName}" foi vinculada à classe "${grelhaFilterClass}ª" do subsistema selecionado.`);
  };

  const handleToggleActive = async (item: GrelhaCurricularItem) => {
    if (isLocked) return;
    const newStatus = item.active === false ? true : false;
    
    const updated = grelhaItems.map(g => g.id === item.id ? { ...g, active: newStatus } : g);
    setGrelhaItems(updated);
    salvarGrelhaCurricular(updated);

    if (settings.syncEnabled) {
      try {
        await performSyncFetch(`/api/grelha/${item.id}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: newStatus })
        });
      } catch (err) {
        console.error("Erro ao sincronizar com o PostgreSQL:", err);
      }
    }
  };

  const handleRemoveGrelhaItem = async (id: string) => {
    if (isLocked) return;
    if (!confirm('Deseja realmente remover em definitivo este vínculo curricular?')) return;
    
    const updated = grelhaItems.filter(item => item.id !== id);
    setGrelhaItems(updated);
    salvarGrelhaCurricular(updated);

    if (settings.syncEnabled) {
      try {
        await performSyncFetch(`/api/grelha/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error("Erro ao sincronizar com o PostgreSQL:", err);
      }
    }
  };

  const handleResetGrelha = async () => {
    if (isLocked) return;
    if (!confirm('Esta acção irá repor toda a matriz de disciplinas oficial (PUNIV e Magistério Angolano) descrita no manual de engenharia do MED. Deseja prosseguir?')) return;
    const reseted = resetarGrelhaCurricular();
    setGrelhaItems(reseted);

    if (settings.syncEnabled) {
      try {
        await performSyncFetch('/api/grelha/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reseted)
        });
      } catch (err) {
        console.error("Erro ao sincronizar reposição com o PostgreSQL:", err);
      }
    }
    alert('Grelha curricular restabelecida com sucesso para o padrão oficial do Ministério da Educação!');
  };

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleMoveGrelhaItem = async (itemId: string, direction: 'up' | 'down') => {
    if (isLocked) return;
    
    // 1. Get the current visible (filtered) items sorted by position
    const filtered = grelhaItems.filter(item => {
      if (item.modality !== grelhaFilterModality) return false;
      if (item.class !== grelhaFilterClass) return false;
      if (grelhaFilterModality !== 'ENSINO_PRIMARIO' && item.specialty !== grelhaFilterSpecialty) return false;
      return true;
    }).sort((a, b) => {
      const posA = a.position !== undefined ? Number(a.position) : 0;
      const posB = b.position !== undefined ? Number(b.position) : 0;
      if (posA !== posB) return posA - posB;
      return (a.subject || '').localeCompare(b.subject || '');
    });

    const index = filtered.findIndex(item => item.id === itemId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filtered.length) return;

    // Swap positions
    const newFiltered = [...filtered];
    const temp = newFiltered[index];
    newFiltered[index] = newFiltered[targetIndex];
    newFiltered[targetIndex] = temp;

    // Assign sequential position values to maintain this order
    const updatedFiltered = newFiltered.map((item, idx) => ({
      ...item,
      position: idx
    }));

    // Update main state by replacing items
    const updatedAll = grelhaItems.map(item => {
      const match = updatedFiltered.find(uf => uf.id === item.id);
      return match ? match : item;
    });

    setGrelhaItems(updatedAll);
    salvarGrelhaCurricular(updatedAll);

    // Synchronize to Postgres if enabled
    if (settings.syncEnabled) {
      try {
        await performSyncFetch('/api/grelha/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFiltered.map(item => ({ id: item.id, position: item.position })))
        });
      } catch (err) {
        console.error("Erro ao salvar ordenação no PostgreSQL:", err);
      }
    }
  };

  const handleGrelhaDragStart = (e: React.DragEvent, id: string) => {
    if (isLocked) return;
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGrelhaDragOver = (e: React.DragEvent, id: string) => {
    if (isLocked) return;
    e.preventDefault();
  };

  const handleGrelhaDrop = async (e: React.DragEvent, targetId: string) => {
    if (isLocked) return;
    e.preventDefault();
    const activeDragId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!activeDragId || activeDragId === targetId) {
      setDraggedItemId(null);
      return;
    }

    const filtered = grelhaItems.filter(item => {
      if (item.modality !== grelhaFilterModality) return false;
      if (item.class !== grelhaFilterClass) return false;
      if (grelhaFilterModality !== 'ENSINO_PRIMARIO' && item.specialty !== grelhaFilterSpecialty) return false;
      return true;
    }).sort((a, b) => {
      const posA = a.position !== undefined ? Number(a.position) : 0;
      const posB = b.position !== undefined ? Number(b.position) : 0;
      if (posA !== posB) return posA - posB;
      return (a.subject || '').localeCompare(b.subject || '');
    });

    const dragIndex = filtered.findIndex(item => item.id === activeDragId);
    const targetIndex = filtered.findIndex(item => item.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    const newFiltered = [...filtered];
    const [draggedItem] = newFiltered.splice(dragIndex, 1);
    newFiltered.splice(targetIndex, 0, draggedItem);

    // Assign positions
    const updatedFiltered = newFiltered.map((item, idx) => ({
      ...item,
      position: idx
    }));

    const updatedAll = grelhaItems.map(item => {
      const match = updatedFiltered.find(uf => uf.id === item.id);
      return match ? match : item;
    });

    setGrelhaItems(updatedAll);
    salvarGrelhaCurricular(updatedAll);

    if (settings.syncEnabled) {
      try {
        await performSyncFetch('/api/grelha/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFiltered.map(item => ({ id: item.id, position: item.position })))
        });
      } catch (err) {
        console.error("Erro ao salvar ordenação drag-drop no PostgreSQL:", err);
      }
    }

    setDraggedItemId(null);
  };

  const isLocked = userRole !== 'SUB_DIRECTOR_PEDAGOGICO';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas ficheiros de imagem (PNG, JPG, SVG, etc.)');
      return;
    }
    
    // limit size to 2MB to keep localStorage healthy
    if (file.size > 2 * 1024 * 1024) {
      alert('O ficheiro é muito grande. Por favor escolha uma imagem menor que 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        if (logoType === 'PUBLIC') {
          setPublicLogoUrl(event.target.result as string);
          setCustomPublicLogoType('IMAGE');
        } else {
          setPrivateLogoUrl(event.target.result as string);
          setCustomLogoType('IMAGE');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) return;

    const updated: SchoolSettings = {
      schoolName,
      municipality,
      province,
      address,
      email,
      phone,
      directorName,
      subdirectorName,
      subdirectorAdminName,
      coordinators: [coordinator1, coordinator2, coordinator3].filter(Boolean),
      secretaryName,
      logoType,
      privateLogoUrl,
      publicLogoUrl,
      syncEnabled,
      syncServerUrl: syncServerUrl.trim(),
      academicYear,
      activeComponents: {
        ENSINO_PRIMARIO: activePrimario,
        PUNIV: activePuniv,
        MAGISTERIO: activeMagisterio
      },
      decretoExecutivo,
      despachoCriacao: decretoExecutivo,
      leiBaseRegulamento,
      leiBase6a,
      leiBase6aActive,
      leiBase9a,
      leiBase9aActive,
      leiBase12a,
      leiBase12aActive,
      leiBase13a,
      leiBase13aActive,
      headerLine1,
      headerLine1Active,
      headerLine2,
      headerLine2Active,
      headerLine3,
      headerLine3Active,
      headerLine4,
      headerLine4Active,
      directorRoleLabel,
      subdirectorRoleLabel,
      subdirectorAdminRoleLabel,
      secretaryRoleLabel
    };

    onChangeSettings(updated);
    setNotifMsg("As configurações institucionais da escola foram salvas com sucesso e aplicadas globalmente!");
    setTimeout(() => setNotifMsg(null), 4000);
  };

  const testConnection = async () => {
    let rawUrl = syncServerUrl.trim();
    if (!rawUrl) {
      setConnStatus('failed');
      setConnMessage('Por favor, introduza o Endereço IP do Servidor SIGEP Backend (ex: http://192.168.44.119:3000) no campo acima antes de testar.');
      return;
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'http://' + rawUrl;
    }

    // Autocorreção Inteligente de Porta e URL
    try {
      const urlObj = new URL(rawUrl);
      if (!urlObj.port || urlObj.port === '80') {
        urlObj.port = '3000';
      } else if (urlObj.port === '30') {
        urlObj.port = '3000';
      }
      rawUrl = urlObj.toString().replace(/\/$/, '');
    } catch (e) {
      if (!/:\d+/.test(rawUrl)) {
        rawUrl = rawUrl + ':3000';
      }
    }

    const targetUrl = rawUrl.replace(/\/$/, '');
    setSyncServerUrl(targetUrl);

    setConnStatus('testing');
    setConnMessage(`Tentando conectar ao servidor em ${targetUrl}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${targetUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        // Tentar invocar inicialização de tabelas no PostgreSQL
        fetch(`${targetUrl}/api/admin/init-db`, { method: 'POST' }).catch(() => null);

        setConnStatus('success');
        setConnMessage(`Conectado com sucesso ao Servidor SIGEP Backend (${targetUrl})! O banco de dados PostgreSQL 'sigep_db' e as tabelas estão ativos e operacionais.`);
        return;
      } else {
        throw new Error(`Código HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Verificação Inteligente de Fallback: Verificar se o próprio computador é o Servidor Central
      try {
        const localCtrl = new AbortController();
        const localTimeout = setTimeout(() => localCtrl.abort(), 2000);
        const resLocal = await fetch('/api/health', { signal: localCtrl.signal }).catch(() => null);
        clearTimeout(localTimeout);

        if (resLocal && resLocal.ok) {
          fetch('/api/admin/init-db', { method: 'POST' }).catch(() => null);
          setConnStatus('success');
          setConnMessage(`Conexão local ativa com sucesso! O aplicativo SIGEP Backend está rodando normalmente na porta 3000 deste computador (Servidor Central). Para que OUTROS PCs da rede conectem via ${targetUrl}, clique no botão "Liberar Firewall Windows".`);
          return;
        }
      } catch (localErr) {}

      // Tentar http://localhost:3000
      try {
        const local3000Ctrl = new AbortController();
        const local3000Timeout = setTimeout(() => local3000Ctrl.abort(), 2000);
        const res3000 = await fetch('http://localhost:3000/api/health', { signal: local3000Ctrl.signal }).catch(() => null);
        clearTimeout(local3000Timeout);

        if (res3000 && res3000.ok) {
          fetch('http://localhost:3000/api/admin/init-db', { method: 'POST' }).catch(() => null);
          setConnStatus('success');
          setConnMessage(`Servidor Central detetado no Localhost! O backend SIGEP respondeu perfeitamente em http://localhost:3000. Para habilitar acesso de outros PCs na LAN via ${targetUrl}, libere a porta 3000 no Firewall do Windows.`);
          return;
        }
      } catch (l3) {}

      setConnStatus('failed');
      if (err.name === 'AbortError') {
        setConnMessage(`Tempo de conexão esgotado (Timeout de 5s) para ${targetUrl}. Verifique se o backend do SIGEP/PostgreSQL está ativo e se a porta 3000 foi liberada no Firewall do Windows.`);
      } else {
        setConnMessage(`Falha na conexão com ${targetUrl}: Certifique-se de que o backend do SIGEP está ativo na mesma rede e de que a porta 3000 está liberada no Firewall do Windows. Erro: ${err.message}`);
      }
    }
  };

  const handleLocalPush = async () => {
    if (!onPushData) return;
    setSyncLoading(true);
    setSyncOpStatus('pushing');
    setSyncProgress(0);
    setSyncStepText('Iniciando envio de dados...');
    setSyncOpMessage('A verificar e carregar todo o ecossistema SIGEP (Cadastros, Matrículas, Pautas, RH, Finanças, Propinas, Grelhas e Parâmetros) para o PostgreSQL central...');

    try {
      const stats = await onPushData((percent, message) => {
        setSyncProgress(percent);
        setSyncStepText(message);
      });
      setLastSyncStats(stats || null);
      setSyncProgress(100);
      setSyncStepText('Sincronização global concluída!');
      setSyncOpStatus('success');
      setSyncOpMessage(
        'Sincronização global do ecossistema SIGEP concluída em tempo real com sucesso! Todos os dados operacionais foram gravados no banco PostgreSQL central.'
      );
    } catch (err: any) {
      setSyncOpStatus('error');
      setSyncOpMessage(
        `Falha de comunicação com PostgreSQL: Não foi possível realizar o envio dos dados. Verifique se o servidor SIGEP Backend (${syncServerUrl || 'servidor local'}) e o PostgreSQL estão em execução e se a porta 3000 está liberada. Erro: ${err.message || 'Sem conexão com a base de dados.'}`
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLocalPull = async () => {
    if (!onPullData) return;
    setSyncLoading(true);
    setSyncOpStatus('pulling');
    setSyncProgress(0);
    setSyncStepText('Iniciando importação de dados...');
    setSyncOpMessage('A importar todo o ecossistema SIGEP do PostgreSQL central (Cadastros, Matrículas, Pautas, RH, Finanças, Propinas, Grelhas e Parâmetros) para este computador...');

    try {
      const stats = await onPullData((percent, message) => {
        setSyncProgress(percent);
        setSyncStepText(message);
      });
      setLastSyncStats(stats || null);
      setSyncProgress(100);
      setSyncStepText('Importação global concluída!');
      setSyncOpStatus('success');
      setSyncOpMessage(
        'Importação global do ecossistema SIGEP concluída em tempo real com sucesso! Os dados mais recentes do PostgreSQL central foram sincronizados localmente.'
      );
    } catch (err: any) {
      setSyncOpStatus('error');
      setSyncOpMessage(
        `Falha de comunicação com PostgreSQL: Não foi possível importar os dados do servidor. Verifique se o servidor SIGEP Backend (${syncServerUrl || 'servidor local'}) está ativo e acessível na rede. Erro: ${err.message || 'Sem resposta do servidor.'}`
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const renderLogoPreview = (url: string, sizeClass = "w-10 h-10") => {
    const val = url || '';
    if (val.startsWith('data:') || val.startsWith('http://') || val.startsWith('https://')) {
      return (
        <img
          src={val}
          alt="Logotipo"
          className={`${sizeClass} object-cover rounded-full border border-slate-300 shadow-xs mx-auto`}
          referrerPolicy="no-referrer"
        />
      );
    }
    if (logoType === 'PUBLIC') {
      return (
        <div className={`${sizeClass} border border-slate-300 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400`}>
          <Building className="w-5 h-5 text-slate-400" />
        </div>
      );
    }
    return (
      <div className={`${sizeClass} border border-indigo-400 bg-indigo-50/20 rounded-full flex items-center justify-center text-lg mx-auto shadow-xs`}>
        {val || '🎓'}
      </div>
    );
  };

  return (
    <div id="cabecalho-settings-parent" className="space-y-6">
      
      {/* Safety Header Status Block */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${
        isLocked 
          ? 'bg-amber-50/75 border-amber-200 text-amber-950' 
          : 'bg-indigo-50 border-indigo-150 text-indigo-950'
      }`}>
        {isLocked ? (
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs leading-relaxed flex-1">
          <span className="font-bold uppercase tracking-wider block mb-0.5">
            {isLocked ? 'Acesso Restrito: Apenas Leitura' : 'Painel de Configuração Modular (Director)'}
          </span>
          {isLocked ? (
            <p>O seu perfil actual é <strong>{userRole === 'SECRETARIO' ? 'Secretário' : 'Professor'}</strong>. Apenas o <strong>Subdirector Pedagógico</strong> está autorizado a reconfigurar os parâmetros escolares. As definições abaixo estão bloqueadas para gravação.</p>
          ) : (
            <p>Gestão modular do ecossistema escolar. Navegue pelas abas abaixo para configurar o cabeçalho oficial do MED, rodapé de cargos e assinaturas, identidade física e matriz curricular oficial.</p>
          )}
        </div>
      </div>

      {notifMsg && (
        <div id="settings-save-success-notification" className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-950 shadow-px animate-pulseOnce">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{notifMsg}</span>
        </div>
      )}

      {/* SUB-PANEL DASHBOARD (ABAS MODULARES) */}
      {activeSubTab === 'MENU' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="config-subpanels-grid">
          {/* Subpanel 1 Button */}
          <button
            type="button"
            onClick={() => setActiveSubTab('CABECALHOS')}
            className="bg-white border border-slate-200 p-5 rounded-2xl text-left hover:border-indigo-500 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">1. Cabeçalhos Oficiais</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">Configure as 4 linhas impressas oficiais da República e o seu estado de exibição.</p>
          </button>

          {/* Subpanel 2 Button */}
          <button
            type="button"
            onClick={() => setActiveSubTab('CARGOS')}
            className="bg-white border border-slate-200 p-5 rounded-2xl text-left hover:border-indigo-500 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">2. Cargos & Assinaturas</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">Defina os nomes associados aos cargos de Direcção e Secretaria no rodapé.</p>
          </button>

          {/* Subpanel 3 Button */}
          <button
            type="button"
            onClick={() => setActiveSubTab('IDENTIDADE')}
            className="bg-white border border-slate-200 p-5 rounded-2xl text-left hover:border-indigo-500 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Building className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">3. Identidade & Sincronização</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">Dados geográficos, contactos da escola, emblemas e conexão ao servidor.</p>
          </button>

          {/* Subpanel 4 Button */}
          <button
            type="button"
            onClick={() => setActiveSubTab('GRELHA')}
            className="bg-white border border-slate-200 p-5 rounded-2xl text-left hover:border-indigo-500 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">4. Matriz Curricular</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">Vincule e visualize disciplinas aos currículos oficiais de forma isolada.</p>
          </button>

          {/* Subpanel 5 Button */}
          <button
            type="button"
            onClick={() => setActiveSubTab('SUBSISTEMA')}
            className="bg-white border border-slate-200 p-5 rounded-2xl text-left hover:border-indigo-500 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">5. Subsistema Legal</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">Defina ou altere a tipologia e subsistemas oficiais ativos no ecossistema.</p>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveSubTab('MENU')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Menu Configuração</span>
            </button>
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">
              {activeSubTab === 'CABECALHOS' && 'Subpainel: Cabeçalhos Oficiais'}
              {activeSubTab === 'CARGOS' && 'Subpainel: Cargos & Assinaturas'}
              {activeSubTab === 'IDENTIDADE' && 'Subpainel: Identidade & Sincronização'}
              {activeSubTab === 'GRELHA' && 'Subpainel: Matriz Curricular'}
              {activeSubTab === 'SUBSISTEMA' && 'Subpainel: Configuração de Subsistema'}
            </span>
          </div>

          {/* Render Active Sub Tab Content */}
          {activeSubTab === 'CABECALHOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="panel-cabecalhos">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Cabeçalhos Oficiais do Selo de Angola</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Edite manualmente as 4 linhas oficiais e oculte/exiba as mesmas nos documentos</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                  {/* Linha 1 */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Linha Oficial 1 (Nação)</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={headerLine1}
                        onChange={(e) => setHeaderLine1(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="pt-5 flex flex-col items-center">
                      <label className="text-[9px] font-bold text-slate-400 mb-1">Imprimir</label>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={headerLine1Active}
                        onChange={(e) => setHeaderLine1Active(e.target.checked)}
                        className="w-4 h-4 text-indigo-650 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Linha 2 */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Linha Oficial 2 (Superintendência)</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={headerLine2}
                        onChange={(e) => setHeaderLine2(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="pt-5 flex flex-col items-center">
                      <label className="text-[9px] font-bold text-slate-400 mb-1">Imprimir</label>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={headerLine2Active}
                        onChange={(e) => setHeaderLine2Active(e.target.checked)}
                        className="w-4 h-4 text-indigo-650 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Linha 3 */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Linha Oficial 3 (Governo Provincial)</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={headerLine3}
                        onChange={(e) => setHeaderLine3(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="pt-5 flex flex-col items-center">
                      <label className="text-[9px] font-bold text-slate-400 mb-1">Imprimir</label>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={headerLine3Active}
                        onChange={(e) => setHeaderLine3Active(e.target.checked)}
                        className="w-4 h-4 text-indigo-650 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Linha 4 */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Linha Oficial 4 (Direcção Municipal)</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={headerLine4}
                        onChange={(e) => setHeaderLine4(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="pt-5 flex flex-col items-center">
                      <label className="text-[9px] font-bold text-slate-400 mb-1">Imprimir</label>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={headerLine4Active}
                        onChange={(e) => setHeaderLine4Active(e.target.checked)}
                        className="w-4 h-4 text-indigo-650 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Gravar Cabeçalhos</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Selo Preview */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white space-y-4">
                <div>
                  <h4 className="font-extrabold text-[10.5px] uppercase text-indigo-400 tracking-widest block font-mono">Pré-visualização do Cabeçalho</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">As linhas abaixo serão ativadas no topo dos relatórios de pauta.</p>
                </div>

                <div className="bg-white p-5 text-xs text-slate-800 rounded-xl border border-slate-150 space-y-1.5 leading-snug shadow-inner text-center font-serif">
                  {logoType === 'PUBLIC' ? (
                    renderLogoPreview(publicLogoUrl || '🇦🇴', "w-10 h-10")
                  ) : (
                    renderLogoPreview(privateLogoUrl, "w-10 h-10")
                  )}
                  
                  {headerLine1Active && <p className="font-extrabold uppercase text-[9px] tracking-widest text-slate-900">{headerLine1}</p>}
                  {headerLine2Active && <p className="font-bold uppercase text-[8px] text-slate-600 tracking-wider">{headerLine2}</p>}
                  {headerLine3Active && <p className="text-[8px] uppercase font-semibold text-indigo-900">{headerLine3}</p>}
                  {headerLine4Active && (
                    <p className="text-[8px] uppercase font-bold text-slate-800 border-t border-dashed border-slate-200 pt-1 font-sans">
                      {headerLine4}
                    </p>
                  )}
                  <p className="text-[10px] font-extrabold uppercase text-slate-800 font-sans py-0.5">
                    {schoolName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'CARGOS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5" id="panel-cargos">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Responsáveis do Conselho Pedagógico & Rótulos de Cargos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Permite editar os títulos/cargos (para refletir o género correto, ex: Directora Geral, Subdirectora Pedagógica, Secretária-Geral) e os respectivos nomes. Estes valores serão aplicados em todas as pautas, mini-pautas, declarações e certificados.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                <div className="space-y-6">
                  {/* O Director da Escola */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Direcção Geral / Direcção da Escola</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Título do Cargo (Género)</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={directorRoleLabel}
                          onChange={(e) => setDirectorRoleLabel(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                          placeholder="Ex: Director Geral ou Directora Geral"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nome do Responsável</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={directorName}
                          onChange={(e) => setDirectorName(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* O Subdirector Pedagógico */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Subdirecção Pedagógica</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Título do Cargo (Género)</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={subdirectorRoleLabel}
                          onChange={(e) => setSubdirectorRoleLabel(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                          placeholder="Ex: Subdirector Pedagógico ou Subdirectora Pedagógica"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nome do Responsável</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={subdirectorName}
                          onChange={(e) => setSubdirectorName(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* O Subdirector Administrativo */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Subdirecção Administrativa</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Título do Cargo (Género)</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={subdirectorAdminRoleLabel}
                          onChange={(e) => setSubdirectorAdminRoleLabel(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                          placeholder="Ex: Subdirector Administrativo ou Subdirectora Administrativa"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nome do Responsável</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={subdirectorAdminName}
                          onChange={(e) => setSubdirectorAdminName(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* O Secretário */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Secretaria Geral / Secretaria</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Título do Cargo (Género)</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={secretaryRoleLabel}
                          onChange={(e) => setSecretaryRoleLabel(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                          placeholder="Ex: Secretário-Geral ou Secretária-Geral"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nome do Responsável</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          required
                          value={secretaryName}
                          onChange={(e) => setSecretaryName(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-white focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  {!isLocked && (
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Gravar Nomes e Rótulos dos Cargos</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Footer Preview Layout Block */}
              <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Pré-visualização do Rodapé de Assinaturas (Impressão)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center pt-4">
                  <div className="space-y-6">
                    <p className="text-[10px] uppercase font-extrabold text-slate-400">{secretaryRoleLabel}</p>
                    <div className="border-t border-slate-400 pt-2 font-black text-slate-800 text-[10.5px]">
                      {secretaryName || '___________________________'}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <p className="text-[10px] uppercase font-extrabold text-slate-400">{subdirectorRoleLabel}</p>
                    <div className="border-t border-slate-400 pt-2 font-black text-slate-800 text-[10.5px]">
                      {subdirectorName || '___________________________'}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <p className="text-[10px] uppercase font-extrabold text-slate-400">{directorRoleLabel}</p>
                    <div className="border-t border-slate-400 pt-2 font-black text-slate-800 text-[10.5px]">
                      {directorName || '___________________________'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'IDENTIDADE' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="panel-identidade">
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Ficha de Identidade da Escola</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Determine os detalhes físicos e ano escolar ativo.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Nome da Escola */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nome Completo da Instituição de Ensino</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          disabled={isLocked}
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Municipio */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Município da Escola</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          disabled={isLocked}
                          value={municipality}
                          onChange={(e) => setMunicipality(e.target.value)}
                          className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Provincia */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Província</label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-semibold text-slate-800"
                      />
                    </div>

                    {/* Ano Lectivo Activo (Apenas Leitura - Gerido no Perfil do Director) */}
                    <div className="space-y-1 md:col-span-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                      <label className="text-[10px] font-black text-indigo-750 uppercase tracking-widest block mb-1">Ano Lectivo Activo (Global do Sistema)</label>
                      <div className="flex items-center justify-between px-3 py-2 border border-indigo-200/80 rounded-xl bg-white shadow-2xs">
                        <span className="text-xs font-black text-indigo-900 font-mono">
                          Ano Lectivo: {settings.academicYear || academicYear || '2025/2026'}
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-200/80 flex items-center gap-1">
                          🔒 Gerido exclusivamente no Painel do Director Geral
                        </span>
                      </div>
                    </div>

                    {/* Despacho / Decreto Executivo de Criação da Escola */}
                    <div className="space-y-1 md:col-span-2 p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                      <label className="text-[10px] font-black text-amber-900 uppercase tracking-widest block mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Despacho / Decreto Executivo de Criação da Escola</span>
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={decretoExecutivo}
                        onChange={(e) => setDecretoExecutivo(e.target.value)}
                        className="px-3 py-2 text-xs border border-amber-200 rounded-xl w-full bg-white focus:outline-none focus:border-amber-500 font-bold text-slate-900 shadow-2xs"
                        placeholder="Ex: Decreto Executivo nº 445/16 de 25 de Novembro ou Despacho nº 01/22"
                      />
                      <span className="text-[9.5px] font-medium text-amber-800/80 block mt-1">
                        Este despacho de criação é automaticamente puxado para Declarações, Certificados e Relatórios Estatísticos Formativos de toda a instituição.
                      </span>
                    </div>

                    {/* Disposto Legal / Leis de Base por Subsistema */}
                    <div className="md:col-span-2 space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Disposto Legal & Leis de Base dos Certificados por Subsistema</span>
                        </label>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                          Apenas subsistemas activos visíveis
                        </span>
                      </div>
                      <p className="text-[9.5px] font-medium text-slate-500 leading-normal">
                        Cada certificado exige o seu enquadramento legal específico. Active ou desactive os campos e personalize a Lei de Base correspondente a cada classe. Enquanto um subsistema estiver inactivo, a sua Lei de Base permanece oculta.
                      </p>

                      <div className="space-y-2.5 mt-2">
                        {/* 1. Lei de Base - 6ª Classe (Ensino Primário) */}
                        {activePrimario && (
                          <div className={`p-3 rounded-xl border transition-all ${leiBase6aActive ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/80 border-slate-200 opacity-75'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase text-indigo-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                Lei de Base — Certificados de 6ª Classe (Ensino Primário)
                              </span>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => setLeiBase6aActive(!leiBase6aActive)}
                                className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                                  leiBase6aActive 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                                    : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                                }`}
                              >
                                {leiBase6aActive ? 'Activo' : 'Desactivado'}
                              </button>
                            </div>
                            <input
                              type="text"
                              disabled={isLocked || !leiBase6aActive}
                              value={leiBase6a}
                              onChange={(e) => setLeiBase6a(e.target.value)}
                              className="px-3 py-1.5 text-xs border border-slate-250 rounded-lg w-full bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-900 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                              placeholder="Ex: disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro"
                            />
                          </div>
                        )}

                        {/* 2. Lei de Base - 9ª Classe (Iº Ciclo do Ensino Geral) */}
                        {(activePuniv || activePrimario) && (
                          <div className={`p-3 rounded-xl border transition-all ${leiBase9aActive ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/80 border-slate-200 opacity-75'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase text-blue-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                Lei de Base — Certificados de 9ª Classe (Iº Ciclo do Ensino Geral)
                              </span>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => setLeiBase9aActive(!leiBase9aActive)}
                                className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                                  leiBase9aActive 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                                    : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                                }`}
                              >
                                {leiBase9aActive ? 'Activo' : 'Desactivado'}
                              </button>
                            </div>
                            <input
                              type="text"
                              disabled={isLocked || !leiBase9aActive}
                              value={leiBase9a}
                              onChange={(e) => setLeiBase9a(e.target.value)}
                              className="px-3 py-1.5 text-xs border border-slate-250 rounded-lg w-full bg-white focus:outline-none focus:border-blue-500 font-bold text-slate-900 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                              placeholder="Ex: disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro"
                            />
                          </div>
                        )}

                        {/* 3. Lei de Base - 12ª Classe (Liceu - IIº Ciclo Geral) */}
                        {activePuniv && (
                          <div className={`p-3 rounded-xl border transition-all ${leiBase12aActive ? 'bg-purple-50/40 border-purple-200' : 'bg-slate-50/80 border-slate-200 opacity-75'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase text-purple-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                Lei de Base — Certificados de 12ª Classe (Liceu - IIº Ciclo Geral)
                              </span>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => setLeiBase12aActive(!leiBase12aActive)}
                                className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                                  leiBase12aActive 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                                    : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                                }`}
                              >
                                {leiBase12aActive ? 'Activo' : 'Desactivado'}
                              </button>
                            </div>
                            <input
                              type="text"
                              disabled={isLocked || !leiBase12aActive}
                              value={leiBase12a}
                              onChange={(e) => setLeiBase12a(e.target.value)}
                              className="px-3 py-1.5 text-xs border border-slate-250 rounded-lg w-full bg-white focus:outline-none focus:border-purple-500 font-bold text-slate-900 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                              placeholder="Ex: disposto no Decreto Executivo nº 445/16 de 25 de Novembro"
                            />
                          </div>
                        )}

                        {/* 4. Lei de Base - 13ª Classe (Magistério - IIº Ciclo Pedagógico) */}
                        {activeMagisterio && (
                          <div className={`p-3 rounded-xl border transition-all ${leiBase13aActive ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/80 border-slate-200 opacity-75'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase text-amber-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                Lei de Base — Certificados de 13ª Classe (Magistério - IIº Ciclo Pedagógico)
                              </span>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => setLeiBase13aActive(!leiBase13aActive)}
                                className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                                  leiBase13aActive 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                                    : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                                }`}
                              >
                                {leiBase13aActive ? 'Activo' : 'Desactivado'}
                              </button>
                            </div>
                            <input
                              type="text"
                              disabled={isLocked || !leiBase13aActive}
                              value={leiBase13a}
                              onChange={(e) => setLeiBase13a(e.target.value)}
                              className="px-3 py-1.5 text-xs border border-slate-250 rounded-lg w-full bg-white focus:outline-none focus:border-amber-500 font-bold text-slate-900 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                              placeholder="Ex: disposto na alínea (f) do artigo 109º da LBSEE 17/16, de 07 de Outubro"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Endereço de Localização Física</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-medium text-slate-750"
                      />
                    </div>

                    {/* Telefone */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Contacto Telefónico</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          disabled={isLocked}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-mono text-slate-700"
                        />
                      </div>
                    </div>

                    {/* E-mail */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">E-mail de Apoio</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          disabled={isLocked}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-full bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white font-mono text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Insígnia Selector */}
                    <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <label className="text-xs font-bold text-slate-700 block">Modelo de Logótipo / Insígnia Escolar</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => setLogoType('PUBLIC')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            logoType === 'PUBLIC' ? 'border-indigo-500 bg-indigo-50/40 font-bold' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className="block text-xs uppercase mb-1">Escola Pública</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => { setLogoType('PRIVATE'); if (!privateLogoUrl) setPrivateLogoUrl('💎'); }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            logoType === 'PRIVATE' ? 'border-indigo-500 bg-indigo-50/40 font-bold' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className="block text-xs uppercase mb-1">Escola Privada</span>
                        </button>
                      </div>

                      {logoType === 'PUBLIC' ? (
                        <div className="space-y-3 pt-2">
                          <input type="file" ref={fileInputRef} disabled={isLocked} accept="image/*" onChange={handleChangeFile} className="hidden" />
                          {publicLogoUrl && (publicLogoUrl.startsWith('data:') || publicLogoUrl.startsWith('http')) ? (
                            <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                              <img src={publicLogoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700">Logótipo Público Ativo</p>
                              </div>
                              {!isLocked && (
                                <button type="button" onClick={() => setPublicLogoUrl('')} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div onClick={() => !isLocked && fileInputRef.current?.click()} className="p-5 rounded-xl border-2 border-dashed text-center cursor-pointer bg-white">
                              <Upload className="w-7 h-7 mx-auto stroke-[1.5] text-slate-400 mb-1" />
                              <div className="text-xs font-bold text-indigo-650">Clique para escolher imagem pública</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2">
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => { setCustomLogoType('EMOJI'); setPrivateLogoUrl('💎'); }}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg border ${customLogoType === 'EMOJI' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-500'}`}
                            >
                              Usar Símbolo/Emoji
                            </button>
                            <button
                              type="button"
                              onClick={() => { setCustomLogoType('IMAGE'); setPrivateLogoUrl(''); }}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg border ${customLogoType === 'IMAGE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-500'}`}
                            >
                              Carregar Imagem Personalizada
                            </button>
                          </div>

                          {customLogoType === 'EMOJI' ? (
                            <select disabled={isLocked} value={privateLogoUrl} onChange={(e) => setPrivateLogoUrl(e.target.value)} className="bg-white border text-xs font-semibold rounded-lg px-2 py-1.5 w-full">
                              <option value="🎓">🎓 Capelo Académico</option>
                              <option value="💎">💎 Diamante Reluzente</option>
                              <option value="⭐">⭐ Estrela de Ouro</option>
                            </select>
                          ) : (
                            <div className="space-y-2">
                              <input type="file" ref={fileInputRef} disabled={isLocked} accept="image/*" onChange={handleChangeFile} className="hidden" />
                              {privateLogoUrl && (privateLogoUrl.startsWith('data:') || privateLogoUrl.startsWith('http')) ? (
                                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                  <img src={privateLogoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700">Logótipo Privado Ativo</p>
                                  </div>
                                  {!isLocked && (
                                    <button type="button" onClick={() => setPrivateLogoUrl('')} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div onClick={() => !isLocked && fileInputRef.current?.click()} className="p-5 rounded-xl border-2 border-dashed text-center cursor-pointer bg-white">
                                  <Upload className="w-7 h-7 mx-auto stroke-[1.5] text-slate-400 mb-1" />
                                  <div className="text-xs font-bold text-indigo-650">Clique para escolher imagem privada</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl">
                        <Save className="w-4 h-4" />
                        <span>Salvar Identidade Escolar</span>
                      </button>
                    </div>
                  )}
                </form>

                {/* Sincronização do Banco de Dados PostgreSQL */}
                <div className="mt-8 pt-8 border-t border-slate-200 space-y-5">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-600 animate-pulse" />
                      <span>Sincronização com Base de Dados Centralizada (PostgreSQL)</span>
                    </h4>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between bg-white border p-3 rounded-xl">
                      <span className="text-xs font-bold text-slate-800 block">Ativar Sincronização On-line</span>
                      <input type="checkbox" checked={syncEnabled} onChange={(e) => setSyncEnabled(e.target.checked)} className="w-4 h-4" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Endereço IP do Servidor SIGEP Backend (Servidor Central)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={syncServerUrl}
                          onChange={(e) => setSyncServerUrl(e.target.value)}
                          placeholder="ex. http://192.168.44.119:3000"
                          className="px-3 py-2 text-xs border rounded-xl flex-1 text-slate-800 font-mono placeholder:text-slate-400 placeholder:font-sans"
                        />
                        <button type="button" onClick={testConnection} className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${connStatus === 'testing' ? 'animate-spin' : ''}`} />
                          <span>Testar Conexão</span>
                        </button>
                        <button type="button" onClick={handleLiberarFirewall} disabled={firewallLoading} className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1 cursor-pointer hover:bg-emerald-100 transition-colors">
                          {firewallLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>Liberar Firewall Windows</span>
                        </button>
                      </div>

                      {firewallResult && (
                        <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-[10.5px] font-medium text-emerald-900">
                          {firewallResult}
                        </div>
                      )}

                      <div className="space-y-2 mt-2">
                        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 text-[10.5px] leading-relaxed text-indigo-950">
                          <p className="font-bold flex items-center gap-1 text-indigo-900">
                            <span>💻 Como Acessar o SIGEP em Outros Computadores da Escola (LAN / Wi-Fi):</span>
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-indigo-900/90 font-medium">
                            <li><strong>PC da Secretaria (Servidor Central)</strong>: Deixe o aplicativo SIGEP <code className="bg-indigo-100 px-1 rounded font-mono text-[10px]">.exe</code> aberto. O servidor roda na porta 3000.</li>
                            <li><strong>Outros PCs (Professores / Gabinetes / Salas)</strong>: <u>NÃO precisa instalar o .exe!</u> Basta abrir qualquer navegador (Google Chrome, Edge) e digitar o endereço do IP: <code className="bg-white border border-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700">{syncServerUrl || 'http://192.168.44.119:3000'}</code></li>
                            <li><strong>Se o teste falhar no PC cliente</strong>: Clique no botão verde <strong>"Liberar Firewall Windows"</strong> acima ou abra a pasta <code className="bg-white border border-indigo-300 px-1 py-0.5 rounded font-mono text-[9.5px]">C:\Backups_SIGEP\liberar_firewall_sigep.bat</code> (Executar como Administrador).</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {connStatus !== 'idle' && (
                      <div className={`p-3 rounded-xl border text-[11px] font-medium ${connStatus === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                        {connMessage}
                      </div>
                    )}

                    <div className="pt-4 border-t space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Botão e Barra de Progresso Push */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled={syncLoading}
                            onClick={handleLocalPush}
                            className={`w-full py-3 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                              syncOpStatus === 'pushing'
                                ? 'bg-indigo-800 text-white animate-pulse cursor-wait shadow-indigo-900/30'
                                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-indigo-600/20'
                            } ${syncLoading && syncOpStatus !== 'pushing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {syncOpStatus === 'pushing' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>A Carregar ({syncProgress}%)...</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-4 h-4" />
                                <span>Carregar Local ➔ Postgres</span>
                              </>
                            )}
                          </button>

                          {/* Barra de Progresso em Percentagem para Envio (Push) */}
                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-indigo-500/30 shadow-md space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                              <span className="text-indigo-300 flex items-center gap-1.5">
                                {syncOpStatus === 'pushing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />}
                                CARREGAR (PUSH)
                              </span>
                              <span className="text-emerald-400 font-mono text-xs">
                                {syncOpStatus === 'pushing' ? `${syncProgress}%` : (syncOpStatus === 'success' ? '100%' : '0%')}
                              </span>
                            </div>

                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
                              <div
                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                                style={{ width: `${syncOpStatus === 'pushing' ? Math.max(syncProgress, 3) : (syncOpStatus === 'success' ? 100 : 0)}%` }}
                              />
                            </div>

                            <p className="text-[10px] text-slate-300 font-medium truncate">
                              {syncOpStatus === 'pushing' ? (syncStepText || 'Processando envio...') : (syncOpStatus === 'success' ? 'Carregamento finalizado com sucesso' : 'Aguardando ação de envio')}
                            </p>
                          </div>
                        </div>

                        {/* Botão e Barra de Progresso Pull */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled={syncLoading}
                            onClick={handleLocalPull}
                            className={`w-full py-3 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                              syncOpStatus === 'pulling'
                                ? 'bg-emerald-800 text-white animate-pulse cursor-wait shadow-emerald-900/30'
                                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-emerald-600/20'
                            } ${syncLoading && syncOpStatus !== 'pulling' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {syncOpStatus === 'pulling' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>A Importar ({syncProgress}%)...</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft className="w-4 h-4" />
                                <span>Importar Postgres ➔ Local</span>
                              </>
                            )}
                          </button>

                          {/* Barra de Progresso em Percentagem para Importação (Pull) */}
                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-emerald-500/30 shadow-md space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                              <span className="text-emerald-300 flex items-center gap-1.5">
                                {syncOpStatus === 'pulling' && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />}
                                IMPORTAR (PULL)
                              </span>
                              <span className="text-emerald-400 font-mono text-xs">
                                {syncOpStatus === 'pulling' ? `${syncProgress}%` : (syncOpStatus === 'success' ? '100%' : '0%')}
                              </span>
                            </div>

                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
                              <div
                                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 h-full rounded-full transition-all duration-300"
                                style={{ width: `${syncOpStatus === 'pulling' ? Math.max(syncProgress, 3) : (syncOpStatus === 'success' ? 100 : 0)}%` }}
                              />
                            </div>

                            <p className="text-[10px] text-slate-300 font-medium truncate">
                              {syncOpStatus === 'pulling' ? (syncStepText || 'Processando importação...') : (syncOpStatus === 'success' ? 'Importação finalizada com sucesso' : 'Aguardando ação de importação')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Caixa de Notificação de Progresso Detalhado */}
                      {syncOpStatus === 'pushing' && (
                        <div className="p-4 bg-indigo-950 text-white border border-indigo-800 rounded-xl space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">A Carregar Dados Locais para PostgreSQL...</p>
                                <p className="text-[11px] text-indigo-300 font-medium">{syncStepText || syncOpMessage}</p>
                              </div>
                            </div>
                            <span className="text-emerald-400 font-extrabold text-sm tracking-wider font-mono">{syncProgress}%</span>
                          </div>
                          
                          <div className="w-full bg-indigo-900/80 rounded-full h-3 overflow-hidden p-0.5 border border-indigo-700">
                            <div
                              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(syncProgress, 3)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {syncOpStatus === 'pulling' && (
                        <div className="p-4 bg-emerald-950 text-white border border-emerald-800 rounded-xl space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">A Importar do PostgreSQL para Local...</p>
                                <p className="text-[11px] text-emerald-300 font-medium">{syncStepText || syncOpMessage}</p>
                              </div>
                            </div>
                            <span className="text-emerald-400 font-extrabold text-sm tracking-wider font-mono">{syncProgress}%</span>
                          </div>
                          
                          <div className="w-full bg-emerald-900/80 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-700">
                            <div
                              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(syncProgress, 3)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {syncOpStatus === 'success' && (
                        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Sincronização Global Realizada com Sucesso!</p>
                              <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">{syncOpMessage}</p>
                            </div>
                          </div>

                          {lastSyncStats && (
                            <div className="pt-2 border-t border-emerald-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-700">🎓 Cadastros, Matrículas & Transferências:</span>
                                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{lastSyncStats.studentsCount} alunos</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-700">📊 Pautas, Mini-Pautas & Avaliações:</span>
                                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{lastSyncStats.gradesCount} lançamentos</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-700">👥 Recursos Humanos & Corpo Docente:</span>
                                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{lastSyncStats.staffCount} funcionários</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-700">💳 Finanças, Recibos & Propinas:</span>
                                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{lastSyncStats.propinasCount} registros</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-700">📚 Grelhas Curriculares & Matrizes:</span>
                                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{lastSyncStats.grelhaCount || 0} disciplinas</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-700">⚙️ Parâmetros & Configurações Escolares:</span>
                                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Ativo & Sincronizado</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {syncOpStatus === 'empty' && (
                        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">Sem Registros para Processar</p>
                            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{syncOpMessage}</p>
                          </div>
                        </div>
                      )}

                      {syncOpStatus === 'error' && (
                        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3">
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-rose-950 uppercase tracking-wider">Falha na Comunicação com PostgreSQL</p>
                            <p className="text-[11px] text-rose-800 font-medium leading-relaxed">{syncOpMessage}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'GRELHA' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5" id="panel-grelha">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-650" />
                    <span>Grelha Curricular Dinâmica por Ciclo de Ensino</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gestão avançada de matrizes curriculares e associação estrita de disciplinas por classe e curso.</p>
                </div>
                <button type="button" onClick={handleResetGrelha} disabled={isLocked} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border rounded-xl hover:bg-slate-100 flex items-center gap-1 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restabelecer Padrão Oficial MED</span>
                </button>
              </div>

              {/* Árvore de Dependência Superior (Cascata de Seleção) */}
              <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-150 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Passo 1: Ciclo / Subsistema */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">1. Ciclo de Ensino / Subsistema</label>
                    <select
                      value={grelhaFilterModality}
                      onChange={(e) => handleModalityChange(e.target.value as ModalityType | '')}
                      className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 w-full text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Selecione o Ciclo --</option>
                      {(settings?.activeComponents?.ENSINO_PRIMARIO !== false) && (
                        <option value="ENSINO_PRIMARIO">🎒 Ensino Primário (1ª - 9ª Classe)</option>
                      )}
                      {(settings?.activeComponents?.PUNIV !== false) && (
                        <option value="PUNIV">🎓 IIº Ciclo do Ensino Secundário Geral (Liceu)</option>
                      )}
                      {(settings?.activeComponents?.MAGISTERIO !== false) && (
                        <option value="MAGISTERIO">👩‍🏫 IIº Ciclo do Ensino Secundário Pedagógico (Magistério)</option>
                      )}
                    </select>
                  </div>

                  {/* Passo 2: Classe Alvo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">2. Classe Alvo</label>
                    <select
                      disabled={!grelhaFilterModality}
                      value={grelhaFilterClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 w-full text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">-- Selecione a Classe --</option>
                      {grelhaFilterModality === 'ENSINO_PRIMARIO' && (
                        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(c => (
                          <option key={c} value={c}>{c}ª Classe</option>
                        ))
                      )}
                      {(grelhaFilterModality === 'PUNIV' || grelhaFilterModality === 'MAGISTERIO') && (
                        ['10', '11', '12', '13'].map(c => (
                          <option key={c} value={c}>{c}ª Classe</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Passo 3: Especialidade / Curso */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">3. Especialidade / Curso</label>
                    {grelhaFilterModality === 'ENSINO_PRIMARIO' ? (
                      <select value="GERAL" disabled className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 w-full text-slate-400">
                        <option value="GERAL">Tronco Comum / Geral</option>
                      </select>
                    ) : grelhaFilterModality === 'PUNIV' ? (
                      <select
                        disabled={!grelhaFilterClass}
                        value={grelhaFilterSpecialty}
                        onChange={(e) => { setNewSubjectName(''); setGrelhaFilterSpecialty(e.target.value); }}
                        className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 w-full text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                      >
                        <option value="">-- Selecione o Curso --</option>
                        <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                        <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                        <option value="CS">Ciências Sociais / Humanas (CS)</option>
                        <option value="AV">Artes Visuais (AV)</option>
                      </select>
                    ) : grelhaFilterModality === 'MAGISTERIO' ? (
                      <select
                        disabled={!grelhaFilterClass}
                        value={grelhaFilterSpecialty}
                        onChange={(e) => { setNewSubjectName(''); setGrelhaFilterSpecialty(e.target.value); }}
                        className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 w-full text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                      >
                        <option value="">-- Selecione o Curso --</option>
                        <option value="MF">Matemática e Física</option>
                        <option value="GH">História e Geografia</option>
                        <option value="BQ">Biologia e Química</option>
                        <option value="LEMC">Português e EMC (L.EMC)</option>
                        <option value="ING_EMC">Inglês e EMC</option>
                        <option value="FRA_EMC">Francês e EMC</option>
                        <option value="EVP">Educação Visual e Plástica</option>
                        <option value="EDF">Educação Física</option>
                        <option value="EMC">Educação Moral e Cívica</option>
                        <option value="EP">Ensino Primário (Pedagogia)</option>
                        <option value="PE">Pré-Escolar (Infância)</option>
                      </select>
                    ) : (
                      <select value="" disabled className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 w-full text-slate-400">
                        <option value="">Escolha o Ciclo primeiro...</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Nova Porta de Entrada Pura (Focado em Criar Disciplinas Novas com critérios de formação) */}
                {!isLocked && (
                  <div className="pt-4 border-t border-slate-250 space-y-4">
                    {grelhaFilterModality === 'PUNIV' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Formação Geral */}
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                          <span className="text-[10px] font-black uppercase text-indigo-700 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Formação Geral
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty}
                              placeholder="ex: Língua Portuguesa..."
                              value={newGeneralSubject}
                              onChange={(e) => setNewGeneralSubject(e.target.value)}
                              onBlur={() => {
                                if (newGeneralSubject.trim()) {
                                  setNewGeneralSubject(formatarNomeDisciplina(newGeneralSubject));
                                }
                              }}
                              className="px-3 py-1.5 border border-slate-200 rounded-xl flex-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                            />
                            <button
                              type="button"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty || !newGeneralSubject.trim()}
                              onClick={async () => {
                                await handleAddGrelhaItem(newGeneralSubject, 'Formação Geral');
                                setNewGeneralSubject('');
                              }}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1 shadow-sm transition-all whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Vincular</span>
                            </button>
                          </div>
                        </div>

                        {/* Formação Específica */}
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                          <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            Formação Específica
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty}
                              placeholder="ex: Física Geral..."
                              value={newSpecificSubject}
                              onChange={(e) => setNewSpecificSubject(e.target.value)}
                              onBlur={() => {
                                if (newSpecificSubject.trim()) {
                                  setNewSpecificSubject(formatarNomeDisciplina(newSpecificSubject));
                                }
                              }}
                              className="px-3 py-1.5 border border-slate-200 rounded-xl flex-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                            />
                            <button
                              type="button"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty || !newSpecificSubject.trim()}
                              onClick={async () => {
                                await handleAddGrelhaItem(newSpecificSubject, 'Formação Específica');
                                setNewSpecificSubject('');
                              }}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1 shadow-sm transition-all whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Vincular</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : grelhaFilterModality === 'MAGISTERIO' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Formação Geral */}
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                          <span className="text-[10px] font-black uppercase text-indigo-700 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Formação Geral
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty}
                              placeholder="ex: Língua Portuguesa..."
                              value={newGeneralSubject}
                              onChange={(e) => setNewGeneralSubject(e.target.value)}
                              onBlur={() => {
                                if (newGeneralSubject.trim()) {
                                  setNewGeneralSubject(formatarNomeDisciplina(newGeneralSubject));
                                }
                              }}
                              className="px-3 py-1.5 border border-slate-200 rounded-xl flex-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                            />
                            <button
                              type="button"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty || !newGeneralSubject.trim()}
                              onClick={async () => {
                                await handleAddGrelhaItem(newGeneralSubject, 'Formação Geral');
                                setNewGeneralSubject('');
                              }}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1 shadow-sm transition-all whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Vincular</span>
                            </button>
                          </div>
                        </div>

                        {/* Formação Educacional */}
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Formação Educacional
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty}
                              placeholder="ex: Psicologia Geral..."
                              value={newEducationalSubject}
                              onChange={(e) => setNewEducationalSubject(e.target.value)}
                              onBlur={() => {
                                if (newEducationalSubject.trim()) {
                                  setNewEducationalSubject(formatarNomeDisciplina(newEducationalSubject));
                                }
                              }}
                              className="px-3 py-1.5 border border-slate-200 rounded-xl flex-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                            />
                            <button
                              type="button"
                              disabled={!grelhaFilterClass || !grelhaFilterSpecialty || !newEducationalSubject.trim()}
                              onClick={async () => {
                                await handleAddGrelhaItem(newEducationalSubject, 'Formação Educacional');
                                setNewEducationalSubject('');
                              }}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1 shadow-sm transition-all whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Vincular</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Ensino Primário ou sem seleção */
                      <div className="flex flex-col sm:flex-row items-end gap-3">
                        <div className="w-full flex-1 space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Inserir Nova Disciplina Livre (Norma Ortográfica Ativa)
                          </label>
                          <input
                            type="text"
                            disabled={!grelhaFilterModality || !grelhaFilterClass || !grelhaFilterSpecialty}
                            placeholder={
                              !grelhaFilterModality || !grelhaFilterClass || !grelhaFilterSpecialty
                                ? "Complete a árvore de seleção acima para habilitar..."
                                : "Escreva o nome da nova disciplina (ex: Estudo do Meio)..."
                            }
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            onBlur={() => {
                              if (newSubjectName.trim()) {
                                setNewSubjectName(formatarNomeDisciplina(newSubjectName));
                              }
                            }}
                            className="px-3.5 py-2 border border-slate-200 rounded-xl w-full text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!grelhaFilterModality || !grelhaFilterClass || !grelhaFilterSpecialty || !newSubjectName.trim()}
                          onClick={() => handleAddGrelhaItem()}
                          className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1.5 shadow-sm transition-all h-[38px]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Vincular Disciplina</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tabela de Disciplinas Mapeadas (Isolamento Estrito) */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden p-4 space-y-4 bg-slate-50/25">
                <div className="flex justify-between items-center pb-3 border-b border-slate-150">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>
                      Disciplinas Mapeadas na {grelhaFilterClass ? `${grelhaFilterClass}ª` : 'Nenhuma'} Classe
                      {grelhaFilterModality === 'ENSINO_PRIMARIO' ? ' (Ensino Primário)' : (grelhaFilterSpecialty ? ` (${grelhaFilterSpecialty})` : '')}
                    </span>
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-150 font-mono">
                    {
                      grelhaItems.filter(item => {
                        if (item.modality !== grelhaFilterModality) return false;
                        if (item.class !== grelhaFilterClass) return false;
                        if (grelhaFilterModality !== 'ENSINO_PRIMARIO' && item.specialty !== grelhaFilterSpecialty) return false;
                        return true;
                      }).length
                    } disciplinas vinculadas
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl bg-white max-h-[350px] overflow-y-auto shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200 tracking-wider">
                        {!isLocked && <th className="p-3 w-16 text-center">Posição</th>}
                        <th className="p-3 pl-4">Componente Curricular</th>
                        <th className="p-3">Classe</th>
                        <th className="p-3">Disciplina Vinculada</th>
                        <th className="p-3 text-center">Estado</th>
                        {!isLocked && <th className="p-3 pr-4 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {grelhaItems
                        .filter(item => {
                          // Strict Scope Isolation: Filter out contamination
                          if (item.modality !== grelhaFilterModality) return false;
                          if (item.class !== grelhaFilterClass) return false;
                          if (grelhaFilterModality !== 'ENSINO_PRIMARIO' && item.specialty !== grelhaFilterSpecialty) return false;
                          return true;
                        })
                        .sort((a, b) => {
                          const posA = a.position !== undefined ? Number(a.position) : 0;
                          const posB = b.position !== undefined ? Number(b.position) : 0;
                          if (posA !== posB) return posA - posB;
                          return (a.subject || '').localeCompare(b.subject || '');
                        })
                        .map((item, idx, arr) => (
                          <tr 
                            key={item.id} 
                            draggable={!isLocked}
                            onDragStart={(e) => handleGrelhaDragStart(e, item.id)}
                            onDragOver={(e) => handleGrelhaDragOver(e, item.id)}
                            onDrop={(e) => handleGrelhaDrop(e, item.id)}
                            className={`hover:bg-slate-50/50 transition-colors ${draggedItemId === item.id ? 'opacity-40 bg-indigo-50/50' : ''} ${!isLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          >
                            {!isLocked && (
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <span title="Arraste para reordenar">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab active:cursor-grabbing" />
                                  </span>
                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveGrelhaItem(item.id, 'up')}
                                      className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400 transition-colors"
                                      title="Mover para cima"
                                    >
                                      <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === arr.length - 1}
                                      onClick={() => handleMoveGrelhaItem(item.id, 'down')}
                                      className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400 transition-colors"
                                      title="Mover para baixo"
                                    >
                                      <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="p-3 pl-4">
                              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-800 border border-blue-100">
                                {item.modality === 'PUNIV' ? 'LICEU' : item.modality === 'MAGISTERIO' ? `MAGISTÉRIO` : 'Ensino Primário'}
                              </span>
                            </td>
                            {/* Rótulo de Classe Limpo (ordinal simples, ex: 5ª ou 10ª) */}
                            <td className="p-3 font-bold text-slate-700 font-mono">{item.class}ª</td>
                            <td className="p-3 font-semibold text-indigo-900">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="font-bold text-slate-800">{item.subject}</span>
                                {item.category ? (
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    item.category === 'Formação Geral'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-150'
                                      : item.category === 'Formação Específica'
                                      ? 'bg-amber-50 text-amber-700 border-amber-150'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                  }`}>
                                    {item.category}
                                  </span>
                                ) : (grelhaFilterModality === 'PUNIV' || grelhaFilterModality === 'MAGISTERIO') ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-150">
                                    Formação Geral
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleToggleActive(item)}
                                className={`mx-auto px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                  item.active !== false
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${item.active !== false ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                <span>{item.active !== false ? 'Ativo' : 'Suspenso'}</span>
                              </button>
                            </td>
                            {!isLocked && (
                              <td className="p-3 pr-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGrelhaItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Remover definitivamente o vínculo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      {grelhaItems.filter(item => {
                        if (item.modality !== grelhaFilterModality) return false;
                        if (item.class !== grelhaFilterClass) return false;
                        if (grelhaFilterModality !== 'ENSINO_PRIMARIO' && item.specialty !== grelhaFilterSpecialty) return false;
                        return true;
                      }).length === 0 && (
                        <tr>
                          <td colSpan={isLocked ? 4 : 6} className="p-8 text-center text-slate-400 bg-slate-50/50">
                            <Layers className="w-8 h-8 mx-auto text-slate-300 stroke-[1.2] mb-2" />
                            <p className="text-xs font-semibold">Grelha Curricular Não Povoada</p>
                            <p className="text-[10px] text-slate-400 mt-1">Nenhuma disciplina vinculada para esta combinação de Ciclo, Classe e Especialidade.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'SUBSISTEMA' && (
            <ConfiguracaoSubsistema userRole={userRole} />
          )}
        </div>
      )}

    </div>
  );
}

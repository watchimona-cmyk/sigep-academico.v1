import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Settings, 
  BookOpen, 
  Layers, 
  Award, 
  CheckCircle, 
  ArrowRightLeft, 
  Plus, 
  RefreshCw, 
  HelpCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';

// Interface para a estrutura do Magistério
interface BlockData {
  formacao_geral: string[];
  formacao_educacional: string[];
}

interface SpecialtyClasses {
  "10_classe": BlockData;
  "11_classe": BlockData;
  "12_classe": BlockData;
  "13_classe": BlockData;
}

interface MagisterioData {
  subsistema: string;
  curso: string;
  descricao: string;
  especialidades: {
    [key: string]: SpecialtyClasses;
  };
}

// Matriz Oficial Corrigida e Atualizada (Seeding Inicial)
const INITIAL_MAGISTERIO_DATA: MagisterioData = {
  "subsistema": "Magistério",
  "curso": "Pedagogia",
  "descricao": "Formação de Professores",
  "especialidades": {
    "Português e EMC": {
      "10_classe": {
        "formacao_geral": ["Língua Francesa", "Língua Inglesa", "Filosofia", "Matemática", "Informática", "História", "Empreendedorismo", "Educação Física"],
        "formacao_educacional": ["PDA", "NEE", "ASEAGE", "HSE", "TEDC", "FPSD", "Ética", "Literatura", "Língua Portuguesa", "MEEMC", "MELP", "PSEP"]
      },
      "11_classe": {
        "formacao_geral": ["Língua Francesa", "Língua Inglesa", "Empreendedorismo", "Educação Física"],
        "formacao_educacional": ["ASEAGE", "TEDC", "FPSD", "Literatura", "Língua Portuguesa", "MEEMC", "MELP", "PSEP"]
      },
      "12_classe": {
        "formacao_geral": ["Filosofia", "Empreendedorismo", "Educação Física"],
        "formacao_educacional": ["HSE", "FPSD", "Ética", "Língua Portuguesa", "MEEMC", "MELP", "PSEP"]
      },
      "13_classe": {
        "formacao_geral": [],
        "formacao_educacional": ["Estágio Pedagógico Supervisionado: NEC", "Estágio Pedagógico Supervisionado: PAP"]
      }
    },
    "Matemática e Física": {
      "10_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Educação Física", "Empreendedorismo"],
        "formacao_educacional": ["PDA", "NEE", "Matemática", "Física"]
      },
      "11_classe": {
        "formacao_geral": ["Língua Portuguesa", "Educação Física", "Empreendedorismo"],
        "formacao_educacional": ["ASEAGE", "Matemática", "Física", "TEDC", "FPSD", "MEM", "MEF", "PSEP"]
      },
      "12_classe": {
        "formacao_geral": ["Filosofia", "Educação Física", "Empreendedorismo"],
        "formacao_educacional": ["HSE", "Matemática", "Física", "MEM", "MEF", "PSEP"]
      },
      "13_classe": {
        "formacao_geral": [],
        "formacao_educacional": ["Estágio Pedagógico Supervisionado: NEC", "Estágio Pedagógico Supervisionado: PAP"]
      }
    },
    "Biologia e Química": {
      "10_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Matemática", "Educação Física", "Empreendedorismo"],
        "formacao_educacional": ["PDA", "NEE", "Química", "Biologia"]
      },
      "11_classe": {
        "formacao_geral": ["Língua Portuguesa", "Educação Física", "Empreendedorismo"],
        "formacao_educacional": ["ASEAGE", "TEDC", "FPSD", "Química", "Biologia", "MEQ", "MEB", "PSEP"]
      },
      "12_classe": {
        "formacao_geral": ["Filosofia", "Educação Física", "Empreendedorismo"],
        "formacao_educacional": ["HSE", "Química", "Biologia", "MEQ", "MEB", "PSEP"]
      },
      "13_classe": {
        "formacao_geral": [],
        "formacao_educacional": ["Estágio Pedagógico Supervisionado: NEC", "Estágio Pedagógico Supervisionado: PAP"]
      }
    },
    "História e Geografia": {
      "10_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Empreendedorismo", "Educação Física", "Matemática"],
        "formacao_educacional": ["PDA", "NEE", "História", "Geografia"]
      },
      "11_classe": {
        "formacao_geral": ["Língua Portuguesa", "Empreendedorismo", "Educação Física"],
        "formacao_educacional": ["ASEAGE", "TEDC", "FPSD", "História", "Geografia", "MEH", "MEG", "PSEP"]
      },
      "12_classe": {
        "formacao_geral": ["Filosofia", "Empreendedorismo", "Educação Física"],
        "formacao_educacional": ["HSE", "História", "Geografia", "MEH", "MEG", "PSEP"]
      },
      "13_classe": {
        "formacao_geral": [],
        "formacao_educacional": ["Estágio Pedagógico Supervisionado: NEC", "Estágio Pedagógico Supervisionado: PAP"]
      }
    },
    "Ensino Primário": {
      "10_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Física", "Biologia", "Química", "História", "Geografia", "Informática", "Empreendedorismo", "Filosofia"],
        "formacao_educacional": ["PDA", "NEE", "Expressões", "MEE"]
      },
      "11_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Matemática", "Empreendedorismo", "Filosofia"],
        "formacao_educacional": ["PDA", "NEE", "TEDC", "MELP", "MEMCN", "Expressões", "PSEP"]
      },
      "12_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Empreendedorismo"],
        "formacao_educacional": ["ASEAGE", "HSE", "MEF", "MEM", "MEH", "Expressões", "MEE", "MEG", "FPSD", "PSEP"]
      },
      "13_classe": {
        "formacao_geral": [],
        "formacao_educacional": ["Estágio Pedagógico Supervisionado: NEC", "Estágio Pedagógico Supervisionado: PAP"]
      }
    },
    "Inglês e EMC": { "10_classe": { "formacao_geral": [], "formacao_educacional": [] }, "11_classe": { "formacao_geral": [], "formacao_educacional": [] }, "12_classe": { "formacao_geral": [], "formacao_educacional": [] }, "13_classe": { "formacao_geral": [], "formacao_educacional": [] } },
    "Francês e EMC": { "10_classe": { "formacao_geral": [], "formacao_educacional": [] }, "11_classe": { "formacao_geral": [], "formacao_educacional": [] }, "12_classe": { "formacao_geral": [], "formacao_educacional": [] }, "13_classe": { "formacao_geral": [], "formacao_educacional": [] } },
    "Educação Visual e Plástica (EVP)": { "10_classe": { "formacao_geral": [], "formacao_educacional": [] }, "11_classe": { "formacao_geral": [], "formacao_educacional": [] }, "12_classe": { "formacao_geral": [], "formacao_educacional": [] }, "13_classe": { "formacao_geral": [], "formacao_educacional": [] } },
    "Educação Física (Ed.F)": { "10_classe": { "formacao_geral": [], "formacao_educacional": [] }, "11_classe": { "formacao_geral": [], "formacao_educacional": [] }, "12_classe": { "formacao_geral": [], "formacao_educacional": [] }, "13_classe": { "formacao_geral": [], "formacao_educacional": [] } },
    "Educação Moral e Cívica (EMC)": { "10_classe": { "formacao_geral": [], "formacao_educacional": [] }, "11_classe": { "formacao_geral": [], "formacao_educacional": [] }, "12_classe": { "formacao_geral": [], "formacao_educacional": [] }, "13_classe": { "formacao_geral": [], "formacao_educacional": [] } },
    "Pré-Escolar": { "10_classe": { "formacao_geral": [], "formacao_educacional": [] }, "11_classe": { "formacao_geral": [], "formacao_educacional": [] }, "12_classe": { "formacao_geral": [], "formacao_educacional": [] }, "13_classe": { "formacao_geral": [], "formacao_educacional": [] } }
  }
};

// Outros subsistemas para manter o isolamento mas não quebrar o restante fluxo escolar
const INITIAL_LICEU_GRIDS = [
  {
    id: "cfb",
    nome: "Ciências Físicas e Biológicas (CFB)",
    classes: {
      "10": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Física", "Química", "Biologia", "Educação Física", "Filosofia", "Informática"],
      "11": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Física", "Química", "Biologia", "Educação Física", "Filosofia", "Informática"],
      "12": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Física", "Química", "Biologia", "Educação Física", "Filosofia", "Informática"]
    }
  },
  {
    id: "cej",
    nome: "Ciências Económico-Jurídicas (CEJ)",
    classes: {
      "10": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "História", "Geografia", "Introdução ao Direito", "Economia", "Filosofia", "Informática", "Educação Física"],
      "11": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "História", "Geografia", "Introdução ao Direito", "Economia", "Filosofia", "Informática", "Educação Física"],
      "12": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "História", "Geografia", "Introdução ao Direito", "Economia", "Filosofia", "Informática", "Educação Física"]
    }
  }
];

const INITIAL_PRIMARIO_GRIDS = [
  {
    id: "primario_1",
    nome: "Ensino Primário Regular (1ª a 6ª Classes)",
    classes: {
      "1ª Classe": ["Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Manual e Plástica (E.M.P.)", "Educação Musical", "Educação Física"],
      "2ª Classe": ["Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Manual e Plástica (E.M.P.)", "Educação Musical", "Educação Física"],
      "3ª Classe": ["Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Manual e Plástica (E.M.P.)", "Educação Musical", "Educação Física"],
      "4ª Classe": ["Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Manual e Plástica (E.M.P.)", "Educação Musical", "Educação Física"],
      "5ª Classe": ["Língua Portuguesa", "Matemática", "Ciências da Natureza", "História", "Geografia", "Educação Moral e Cívica", "Educação Visual e Plástica", "Educação Musical", "Educação Física"],
      "6ª Classe": ["Língua Portuguesa", "Matemática", "Ciências da Natureza", "História", "Geografia", "Educação Moral e Cívica", "Educação Visual e Plástica", "Educação Musical", "Educação Física"]
    }
  }
];

export const ConfiguracaoEspecialidade: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [activeSubsystem, setActiveSubsystem] = useState<'MAGISTERIO' | 'LICEU' | 'PRIMARIO'>('MAGISTERIO');
  
  // Magistério Curriculum State
  const [magisterioData, setMagisterioData] = useState<MagisterioData>(() => {
    const saved = localStorage.getItem('sigep_magisterio_curriculo_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.especialidades) return parsed;
      } catch (e) {
        console.error("Erro ao analisar dados do Magistério:", e);
      }
    }
    return INITIAL_MAGISTERIO_DATA;
  });

  // Outros subsistemas
  const [liceuGrids, setLiceuGrids] = useState(() => {
    const saved = localStorage.getItem('sigep_grelha_liceu_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_LICEU_GRIDS;
  });

  const [primarioGrids, setPrimarioGrids] = useState(() => {
    const saved = localStorage.getItem('sigep_grelha_primario_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_PRIMARIO_GRIDS;
  });

  // UI Selection State for Magistério
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("Português e EMC");
  const [selectedClass, setSelectedClass] = useState<keyof SpecialtyClasses>("10_classe");
  
  // Interactive Editing State
  const [editingDiscipline, setEditingDiscipline] = useState<{ block: 'formacao_geral' | 'formacao_educacional', index: number, value: string } | null>(null);
  const [newDisciplineName, setNewDisciplineName] = useState("");
  const [newDisciplineBlock, setNewDisciplineBlock] = useState<'formacao_geral' | 'formacao_educacional'>('formacao_geral');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'success' | 'info' | 'error', texto: string } | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('sigep_magisterio_curriculo_v2', JSON.stringify(magisterioData));
  }, [magisterioData]);

  useEffect(() => {
    localStorage.setItem('sigep_grelha_liceu_v1', JSON.stringify(liceuGrids));
  }, [liceuGrids]);

  useEffect(() => {
    localStorage.setItem('sigep_grelha_primario_v1', JSON.stringify(primarioGrids));
  }, [primarioGrids]);

  const isDG = userRole === 'DIRECTOR_GERAL' || userRole === 'DIRETOR_GERAL';

  const showNotification = (texto: string, tipo: 'success' | 'info' | 'error' = 'success') => {
    setStatusMsg({ tipo, texto });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // 1. Dropdown options
  const specialtiesList = Object.keys(magisterioData.especialidades);
  const classesList: { value: keyof SpecialtyClasses; label: string }[] = [
    { value: "10_classe", label: "10ª" },
    { value: "11_classe", label: "11ª" },
    { value: "12_classe", label: "12ª" },
    { value: "13_classe", label: "13ª (Estágio)" },
  ];

  const currentClassData = magisterioData.especialidades[selectedSpecialty]?.[selectedClass] || { formacao_geral: [], formacao_educacional: [] };

  // 2. Action: Adicionar Nova Disciplina
  const handleAddDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDG) {
      showNotification("Apenas o Director Geral possui permissão para alterar as matrizes curriculares.", "error");
      return;
    }
    const name = newDisciplineName.trim();
    if (!name) {
      showNotification("O nome da disciplina não pode estar em branco.", "error");
      return;
    }

    // Verificar duplicações
    const geralList = currentClassData.formacao_geral;
    const educList = currentClassData.formacao_educacional;
    if (geralList.includes(name) || educList.includes(name)) {
      showNotification(`A disciplina "${name}" já existe nesta classe.`, "error");
      return;
    }

    setMagisterioData(prev => {
      const updatedSpecs = { ...prev.especialidades };
      const currentClassSpec = { ...updatedSpecs[selectedSpecialty][selectedClass] };
      
      currentClassSpec[newDisciplineBlock] = [...currentClassSpec[newDisciplineBlock], name];
      updatedSpecs[selectedSpecialty][selectedClass] = currentClassSpec;

      return {
        ...prev,
        especialidades: updatedSpecs
      };
    });

    setNewDisciplineName("");
    setIsAddingInline(false);
    showNotification(`Disciplina "${name}" adicionada com sucesso ao bloco de ${newDisciplineBlock === 'formacao_geral' ? 'Formação Geral' : 'Formação Educacional'}.`);
  };

  // 3. Action: Remover Disciplina
  const handleRemoveDiscipline = (block: 'formacao_geral' | 'formacao_educacional', index: number) => {
    if (!isDG) {
      showNotification("Permissão negada. Apenas o Director Geral pode remover matérias.", "error");
      return;
    }
    const name = currentClassData[block][index];
    if (!confirm(`Tem certeza que deseja remover a disciplina "${name}" desta grelha curricular?`)) {
      return;
    }

    setMagisterioData(prev => {
      const updatedSpecs = { ...prev.especialidades };
      const currentClassSpec = { ...updatedSpecs[selectedSpecialty][selectedClass] };
      
      currentClassSpec[block] = currentClassSpec[block].filter((_, i) => i !== index);
      updatedSpecs[selectedSpecialty][selectedClass] = currentClassSpec;

      return {
        ...prev,
        especialidades: updatedSpecs
      };
    });

    showNotification(`Disciplina "${name}" removida com sucesso.`);
  };

  // 4. Action: Iniciar Edição
  const startEdit = (block: 'formacao_geral' | 'formacao_educacional', index: number, value: string) => {
    if (!isDG) {
      showNotification("Apenas o Director Geral possui permissão para editar disciplinas.", "error");
      return;
    }
    setEditingDiscipline({ block, index, value });
  };

  // 5. Action: Salvar Edição
  const handleSaveEdit = () => {
    if (!editingDiscipline) return;
    const { block, index, value } = editingDiscipline;
    const trimmedVal = value.trim();

    if (!trimmedVal) {
      showNotification("O nome da disciplina não pode ser vazio.", "error");
      return;
    }

    setMagisterioData(prev => {
      const updatedSpecs = { ...prev.especialidades };
      const currentClassSpec = { ...updatedSpecs[selectedSpecialty][selectedClass] };
      const list = [...currentClassSpec[block]];
      list[index] = trimmedVal;
      currentClassSpec[block] = list;
      updatedSpecs[selectedSpecialty][selectedClass] = currentClassSpec;

      return {
        ...prev,
        especialidades: updatedSpecs
      };
    });

    setEditingDiscipline(null);
    showNotification("Nome da disciplina atualizado.");
  };

  // 6. Action: Alternar Bloco (Formação Geral <-> Formação Educacional)
  const handleMoveBlock = (block: 'formacao_geral' | 'formacao_educacional', index: number) => {
    if (!isDG) {
      showNotification("Permissão negada para mover disciplinas entre blocos curriculares.", "error");
      return;
    }
    const name = currentClassData[block][index];
    const targetBlock = block === 'formacao_geral' ? 'formacao_educacional' : 'formacao_geral';

    setMagisterioData(prev => {
      const updatedSpecs = { ...prev.especialidades };
      const currentClassSpec = { ...updatedSpecs[selectedSpecialty][selectedClass] };
      
      // Remover da origem
      currentClassSpec[block] = currentClassSpec[block].filter((_, i) => i !== index);
      // Adicionar no destino
      currentClassSpec[targetBlock] = [...currentClassSpec[targetBlock], name];

      updatedSpecs[selectedSpecialty][selectedClass] = currentClassSpec;

      return {
        ...prev,
        especialidades: updatedSpecs
      };
    });

    showNotification(`Matéria "${name}" transferida com sucesso para o bloco de ${targetBlock === 'formacao_geral' ? 'Formação Geral' : 'Formação Educacional'}.`);
  };

  // 7. Action: Povoar com matriz básica/sugerida em caso de estado vazio
  const handlePopulateSuggested = () => {
    if (!isDG) {
      showNotification("Permissão negada para restaurar ou redefinir a matriz.", "error");
      return;
    }

    // Sugere disciplinas padrões de Pedagogia com base na classe selecionada
    const suggested: { [key in keyof SpecialtyClasses]: BlockData } = {
      "10_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Matemática", "Filosofia", "Informática", "Educação Física"],
        "formacao_educacional": ["PDA", "NEE", "História", "Geografia", "Expressões"]
      },
      "11_classe": {
        "formacao_geral": ["Língua Portuguesa", "Língua Inglesa", "Empreendedorismo", "Educação Física"],
        "formacao_educacional": ["ASEAGE", "TEDC", "FPSD", "Prática Pedagógica (PSEP)", "PDA"]
      },
      "12_classe": {
        "formacao_geral": ["Língua Portuguesa", "Filosofia", "Educação Física"],
        "formacao_educacional": ["HSE", "MEB", "MEQ", "PSEP"]
      },
      "13_classe": {
        "formacao_geral": [],
        "formacao_educacional": ["Estágio Pedagógico Supervisionado: NEC", "Estágio Pedagógico Supervisionado: PAP"]
      }
    };

    setMagisterioData(prev => {
      const updatedSpecs = { ...prev.especialidades };
      updatedSpecs[selectedSpecialty] = { ...suggested };
      return {
        ...prev,
        especialidades: updatedSpecs
      };
    });

    showNotification(`A especialidade "${selectedSpecialty}" foi inicializada com a matriz padrão pedagógica sugerida do Magistério.`);
  };

  // Reiniciar TODAS as especialidades do Magistério para a matriz original corrigida
  const handleResetToFactory = () => {
    if (!isDG) {
      showNotification("Permissão negada. Apenas o Director Geral pode reiniciar as grelhas oficiais do Magistério.", "error");
      return;
    }
    if (!confirm("AVISO: Esta ação irá apagar todas as modificações manuais do Magistério e restaurar a grelha curricular oficial do Ministério da Educação. Deseja prosseguir?")) {
      return;
    }
    setMagisterioData(INITIAL_MAGISTERIO_DATA);
    showNotification("Grelhas curriculares do Magistério repostas para o padrão oficial com sucesso!", "info");
  };

  // Filtragem de disciplinas em tempo real
  const filterList = (list: string[]) => {
    if (!searchFilter.trim()) return list;
    return list.filter(item => item.toLowerCase().includes(searchFilter.toLowerCase()));
  };

  const filteredGeral = filterList(currentClassData.formacao_geral || []);
  const filteredEducacional = filterList(currentClassData.formacao_educacional || []);

  const totalFilteredCount = filteredGeral.length + filteredEducacional.length;
  const isSelectedSpecialtyEmpty = (currentClassData.formacao_geral || []).length === 0 && (currentClassData.formacao_educacional || []).length === 0;

  // Lógica para exportar como JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(magisterioData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sigep_academic_curriculo_magisterio.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Matriz curricular exportada com sucesso em formato JSON.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMsg && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 p-4 rounded-xl text-xs font-black shadow-lg animate-bounce transition-all ${
          statusMsg.tipo === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
            : statusMsg.tipo === 'info'
              ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
        }`}>
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg.texto}</span>
        </div>
      )}

      {/* Navegação entre Grelhas de Referência */}
      <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubsystem('MAGISTERIO')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubsystem === 'MAGISTERIO' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650 hover:bg-slate-50/70 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>1. Grelha do Magistério (Pedagogia)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubsystem('LICEU')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubsystem === 'LICEU' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650 hover:bg-slate-50/70 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>2. IIº Ciclo Geral (PUNIV)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubsystem('PRIMARIO')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubsystem === 'PRIMARIO' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650 hover:bg-slate-50/70 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>3. Ensino Primário Regular</span>
        </button>
      </div>

      {/* 1. SEÇÃO PRINCIPAL: SUBSISTEMA DO MAGISTÉRIO */}
      {activeSubsystem === 'MAGISTERIO' && (
        <div className="space-y-6">
          
          {/* Header descritivo e estanque */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Matriz Isolada & Estanque do Magistério
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide mt-2">
                  Subsistema de Formação de Professores (Pedagogia)
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Gestão integrada de especialidades e blocos curriculares (Formação Geral vs. Formação Educacional) de 10ª a 13ª Classes.
                </p>
              </div>

              <div className="flex gap-2 self-stretch md:self-auto">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex-1 md:flex-none px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Descarregar estrutura curricular atual em formato JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Matriz</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToFactory}
                  className="flex-1 md:flex-none px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Redefinir todas as grelhas para o padrão oficial do Ministério da Educação"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>Restaurar Matrizes</span>
                </button>
              </div>
            </div>

            {/* Painel de seleção de parâmetros - Dropdowns Oficiais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              
              {/* Dropdown Especialidade */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                  Especialidade do Magistério
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => {
                    setSelectedSpecialty(e.target.value);
                    setSearchFilter("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-extrabold focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {specialtiesList.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Classe */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                  Classe Letiva (Anos de Ensino)
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value as any);
                    setSearchFilter("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-extrabold focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {classesList.map((cl) => (
                    <option key={cl.value} value={cl.value}>
                      {cl.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Rápido de Disciplinas */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                  Filtrar Matérias por Nome
                </label>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Pesquisar disciplina..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

            </div>
          </div>

          {/* ESTADO VAZIO: Caso a especialidade/classe selecionada não possua disciplinas iniciais */}
          {isSelectedSpecialtyEmpty ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-5">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Grelha Curricular Não Povoada
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                  A especialidade <strong className="text-slate-800">"{selectedSpecialty}"</strong> na <strong className="text-slate-800">{classesList.find(c => c.value === selectedClass)?.label}</strong> não possui disciplinas cadastradas na nossa base de dados corrente.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={handlePopulateSuggested}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Povoar com Matriz Sugerida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingInline(true)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Criar Primeira Disciplina</span>
                </button>
              </div>
            </div>
          ) : (
            
            /* GRELHA DO CURRÍCULO DIVIDIDA EM DOIS BLOCOS INDEPENDENTES */
            <div className="space-y-6">

              {/* Botão Global de Adição de Disciplinas */}
              <div className="flex justify-between items-center bg-white px-5 py-4 rounded-xl border border-slate-200/60 shadow-xs">
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-bold">
                  <span className="bg-indigo-50 border border-indigo-150 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                    Status da Grelha
                  </span>
                  <span>Especialidade: <strong className="text-slate-900 font-extrabold">{selectedSpecialty}</strong> • Classe: <strong className="text-slate-900 font-extrabold">{classesList.find(c => c.value === selectedClass)?.label}</strong></span>
                </div>

                {!isAddingInline && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingInline(true);
                      setNewDisciplineBlock('formacao_geral');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Nova Disciplina</span>
                  </button>
                )}
              </div>

              {/* Formulário de Adição de Disciplina (Inline / Sanfonado) */}
              {isAddingInline && (
                <form onSubmit={handleAddDiscipline} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-indigo-600" />
                      <span>Cadastrar Nova Disciplina na Matriz Curricular</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddingInline(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    
                    {/* Nome da disciplina */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-550 uppercase tracking-wider block">Nome da Disciplina</label>
                      <input
                        type="text"
                        value={newDisciplineName}
                        onChange={(e) => setNewDisciplineName(e.target.value)}
                        placeholder="Ex: Metodologia de Ensino de História"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Bloco Curricular de Destino */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-550 uppercase tracking-wider block">Bloco Curricular de Destino</label>
                      <select
                        value={newDisciplineBlock}
                        onChange={(e) => setNewDisciplineBlock(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="formacao_geral">Formação Geral</option>
                        <option value="formacao_educacional">Formação Educacional / Pedagógica</option>
                      </select>
                    </div>

                    {/* Ações */}
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        Confirmar Registo
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingInline(false)}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold uppercase text-xs tracking-wider rounded-lg transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                  </div>
                </form>
              )}

              {/* Colunas do Bloco Curricular */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* BLOCO 1: FORMAÇÃO GERAL */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-indigo-50/75 border-b border-indigo-100 p-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-650 inline-block"></span>
                          <span>Bloco I: Formação Geral</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Tronco comum e matriz base escolar regulamentar.</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-md uppercase">
                        {filteredGeral.length} Matérias
                      </span>
                    </div>

                    <div className="p-4">
                      {filteredGeral.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-bold italic text-xs">
                          {searchFilter ? "Nenhuma disciplina correspondente ao filtro." : "Nenhuma disciplina neste bloco curricular."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-150 text-slate-400 font-black uppercase text-[9px] tracking-wider">
                                <th className="pb-2.5">Nome da Disciplina</th>
                                <th className="pb-2.5 text-right">Ações de Ajuste</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {filteredGeral.map((item, index) => {
                                const originalIdx = currentClassData.formacao_geral.indexOf(item);
                                const isEditingThis = editingDiscipline && editingDiscipline.block === 'formacao_geral' && editingDiscipline.index === originalIdx;

                                return (
                                  <tr key={`fg-${index}`} className="hover:bg-slate-50/40">
                                    <td className="py-3 pr-2 font-extrabold text-slate-800">
                                      {isEditingThis ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={editingDiscipline?.value || ""}
                                            onChange={(e) => setEditingDiscipline(prev => prev ? { ...prev, value: e.target.value } : null)}
                                            className="bg-white border border-slate-350 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-550 w-full"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit();
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded cursor-pointer"
                                            title="Confirmar"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingDiscipline(null)}
                                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded cursor-pointer"
                                            title="Cancelar"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span>{item}</span>
                                      )}
                                    </td>
                                    
                                    <td className="py-3 text-right">
                                      <div className="inline-flex gap-1">
                                        
                                        {/* Alternar Bloco (Mover para Educacional) */}
                                        <button
                                          type="button"
                                          onClick={() => handleMoveBlock('formacao_geral', originalIdx)}
                                          className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          title="Transferir para Formação Educacional"
                                        >
                                          <ArrowRightLeft className="w-3 h-3 text-indigo-650" />
                                          <span className="hidden sm:inline">Mover Bloco</span>
                                        </button>

                                        {/* Editar Nome */}
                                        <button
                                          type="button"
                                          onClick={() => startEdit('formacao_geral', originalIdx, item)}
                                          className="p-1.5 border border-slate-200 hover:bg-indigo-50 text-indigo-650 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                          title="Alterar designação"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>

                                        {/* Remover */}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDiscipline('formacao_geral', originalIdx)}
                                          className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                          title="Remover matéria da grelha"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>

                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: FORMAÇÃO EDUCACIONAL E ESTÁGIOS */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-emerald-50/75 border-b border-emerald-100 p-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                          <span>Bloco II: Formação Educacional / Pedagógica</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Matérias de formação técnico-profissional e Estágio Supervisionado.</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-md uppercase">
                        {filteredEducacional.length} Matérias
                      </span>
                    </div>

                    <div className="p-4">
                      {filteredEducacional.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-bold italic text-xs">
                          {searchFilter ? "Nenhuma disciplina correspondente ao filtro." : "Nenhuma disciplina neste bloco curricular."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-150 text-slate-400 font-black uppercase text-[9px] tracking-wider">
                                <th className="pb-2.5">Nome da Disciplina</th>
                                <th className="pb-2.5 text-right">Ações de Ajuste</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {filteredEducacional.map((item, index) => {
                                const originalIdx = currentClassData.formacao_educacional.indexOf(item);
                                const isEditingThis = editingDiscipline && editingDiscipline.block === 'formacao_educacional' && editingDiscipline.index === originalIdx;

                                return (
                                  <tr key={`fe-${index}`} className="hover:bg-slate-50/40">
                                    <td className="py-3 pr-2 font-extrabold text-slate-800">
                                      {isEditingThis ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={editingDiscipline?.value || ""}
                                            onChange={(e) => setEditingDiscipline(prev => prev ? { ...prev, value: e.target.value } : null)}
                                            className="bg-white border border-slate-350 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-550 w-full"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit();
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded cursor-pointer"
                                            title="Confirmar"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingDiscipline(null)}
                                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded cursor-pointer"
                                            title="Cancelar"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span>{item}</span>
                                      )}
                                    </td>
                                    
                                    <td className="py-3 text-right">
                                      <div className="inline-flex gap-1">
                                        
                                        {/* Alternar Bloco (Mover para Geral) */}
                                        <button
                                          type="button"
                                          onClick={() => handleMoveBlock('formacao_educacional', originalIdx)}
                                          className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          title="Transferir para Formação Geral"
                                        >
                                          <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
                                          <span className="hidden sm:inline">Mover Bloco</span>
                                        </button>

                                        {/* Editar Nome */}
                                        <button
                                          type="button"
                                          onClick={() => startEdit('formacao_educacional', originalIdx, item)}
                                          className="p-1.5 border border-slate-200 hover:bg-indigo-50 text-indigo-650 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                          title="Alterar designação"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>

                                        {/* Remover */}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDiscipline('formacao_educacional', originalIdx)}
                                          className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                          title="Remover matéria da grelha"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>

                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Informação Técnica Legal */}
              <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex gap-3 text-xs text-blue-900">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold uppercase">Nota de Conformidade Curricular do Magistério:</p>
                  <p className="font-semibold leading-relaxed">
                    A 13ª Classe destina-se exclusivamente ao <strong className="text-blue-950">Estágio Pedagógico Supervisionado</strong> (NEC e PAP), em conformidade estrita com o Decreto Presidencial sobre o Estatuto da Carreira Docente em Angola. O isolamento e estanqueidade desta base garantem que alterações feitas no PUNIV ou Ensino Primário Regular nunca afetem as credenciais de habilitação e pautas dos futuros pedagogos formados pelo SIGEP-Academic.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 2. SEÇÃO AUXILIAR: SUBSISTEMA LICEU (PUNIV) */}
      {activeSubsystem === 'LICEU' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Matriz Geral - IIº Ciclo Geral (PUNIV)
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Plano de estudos padrão voltado para a preparação académica do Ensino Superior (10ª a 12ª Classes).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liceuGrids.map((grid: any) => (
              <div key={grid.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:shadow-2xs transition-shadow">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                  {grid.nome}
                </h3>
                <div className="space-y-3.5 text-xs text-slate-650 font-medium">
                  {Object.entries(grid.classes).map(([cl, subjects]: [string, any]) => (
                    <div key={cl}>
                      <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mr-1.5">
                        {cl}ª Classe
                      </span>
                      <p className="text-slate-600 mt-1 pl-1 leading-relaxed">
                        {subjects.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SEÇÃO AUXILIAR: ENSINO PRIMÁRIO REGULAR */}
      {activeSubsystem === 'PRIMARIO' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Matriz do Ensino Primário Regular (1ª a 6ª Classes)
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Grelha disciplinar básica e elementar comum para a instrução primária regular de Angola.
            </p>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
              {primarioGrids[0]?.nome}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-650 font-medium">
              {Object.entries(primarioGrids[0]?.classes || {}).map(([cl, subjects]: [string, any]) => (
                <div key={cl} className="p-3 bg-white border border-slate-150 rounded-xl">
                  <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-1 rounded-lg">
                    {cl}
                  </span>
                  <p className="text-slate-600 mt-2.5 leading-relaxed">
                    {subjects.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

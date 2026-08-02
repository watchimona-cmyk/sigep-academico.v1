import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  ChevronRight, 
  Award, 
  PlusCircle, 
  Layers, 
  CheckCircle,
  FileText,
  UserCheck,
  UserMinus,
  UserPlus,
  ArrowLeft,
  RefreshCw,
  MoveRight,
  MoveLeft,
  ArrowRightLeft
} from 'lucide-react';
import { Student, GradeRow } from '../types';
import PainelMatriculas from './PainelMatriculas';

interface Discipline {
  id: string;
  name: string;
}

interface Specialty {
  id: string;
  name: string;
  code: string;
  disciplinesByClass: { [classNum: string]: string[] }; // ex: "10": ["Língua Portuguesa", "Matemática"]
}

interface Course {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  specialties: Specialty[];
}

// Dados padrão realistas baseados nas matrizes curriculares do Ministério da Educação (MED) de Angola
const INITIAL_COURSES: Course[] = [
  {
    id: '0',
    name: 'Ensino Primário',
    code: 'ENSINO_PRIMARIO',
    isActive: true,
    specialties: [
      {
        id: '0-1',
        name: 'Geral (Ensino Primário)',
        code: 'GERAL',
        disciplinesByClass: {
          '1': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Física', 'Educação Manual e Plástica (E.M.P.)', 'Educação Musical'],
          '2': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Física', 'Educação Manual e Plástica (E.M.P.)', 'Educação Musical'],
          '3': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Física', 'Educação Manual e Plástica (E.M.P.)', 'Educação Musical'],
          '4': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Física', 'Educação Manual e Plástica (E.M.P.)', 'Educação Musical'],
          '5': ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', 'Educação Física', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical'],
          '6': ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', 'Educação Física', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical'],
          '7': ['Língua Portuguesa', 'Língua Inglesa', 'Língua Francesa', 'Matemática', 'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Educação Física', 'Educação Moral e Cívica', 'Educação Visual', 'Educação Laboral', 'Empreendedorismo'],
          '8': ['Língua Portuguesa', 'Língua Inglesa', 'Língua Francesa', 'Matemática', 'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Educação Física', 'Educação Moral e Cívica', 'Educação Visual', 'Educação Laboral', 'Empreendedorismo'],
          '9': ['Língua Portuguesa', 'Língua Inglesa', 'Língua Francesa', 'Matemática', 'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Educação Física', 'Educação Moral e Cívica', 'Educação Visual', 'Educação Laboral', 'Empreendedorismo']
        }
      }
    ]
  },
  {
    id: '1',
    name: 'Ensino Geral (PUNIV)',
    code: 'PUNIV',
    isActive: true,
    specialties: [
      {
        id: '1-1',
        name: 'Ciências Físicas e Biológicas (CFB)',
        code: 'CFB',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Física', 'Química', 'Biologia', 'Filosofia', 'Educação Física'],
          '12': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Física', 'Química', 'Biologia', 'Filosofia']
        }
      },
      {
        id: '1-2',
        name: 'Ciências Económico-Jurídicas (CEJ)',
        code: 'CEJ',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Introdução ao Direito', 'Economia', 'Geografia', 'História', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Introdução ao Direito', 'Economia', 'Geografia', 'Filosofia', 'Educação Física'],
          '12': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Introdução ao Direito', 'Economia', 'Filosofia']
        }
      },
      {
        id: '1-3',
        name: 'Ciências Sociais (CS)',
        code: 'CS',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Francesa', 'História', 'Geografia', 'Psicologia', 'Matemática', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Francesa', 'História', 'Geografia', 'Psicologia', 'Sociologia', 'Filosofia', 'Educação Física'],
          '12': ['Língua Portuguesa', 'Língua Francesa', 'História', 'Geografia', 'Sociologia', 'Filosofia']
        }
      },
      {
        id: '1-4',
        name: 'Artes Visuais (AV)',
        code: 'AV',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'História das Artes', 'Desenho Técnico', 'Geometria Descritiva', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'História das Artes', 'Técnicas de Expressão', 'Geometria Descritiva', 'Filosofia', 'Educação Física'],
          '12': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'História das Artes', 'Oficinas de Arte', 'Filosofia']
        }
      }
    ]
  },
  {
    id: '2',
    name: 'Formação de Professores (Magistério)',
    code: 'MAGISTERIO',
    isActive: true,
    specialties: [
      {
        id: '2-2',
        name: 'Ensino Primário (EP)',
        code: 'EP',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa','Língua Francesa','Informática','Expressões','Física','Biologia','Química', 'Matemática', 'PDA', 'História','Geografia', 'Empreendedorismo'],
          '11': ['Língua Portuguesa', 'Língua Inglesa','Língua Francesa', 'Expressões','TEDC', 'PSEP', 'PDA', 'NEE','MEMCN','MELP','Matemática','Empreendedorismo', 'Filosofia'],
          '12': ['Língua Portuguesa','Língua Inglesa','Língua Francesa', 'Matemática', 'ASEAGE', 'HSE','MEM','MEF','MEH','MEG','PSEP','FPSD','Expressões', 'Empreendedorismo'],
          '13': ['NEC', 'PAP']
        }
      },
      {
        id: '2-3',
        name: 'Matemática e Física (MF)',
        code: 'MF',
        disciplinesByClass: {
          '10': ['Língua Portuguesa','Língua Inglesa', 'Matemática', 'Física', 'PDA', 'Informática','Empreendedorismo', 'Educação Física'],
          '11': ['Língua Portuguesa','Matemática', 'Física', 'ASEAGE', 'TEDC','MEF','MEM','PSEP','FPSD','Empreendedorismo', 'Educação Física'],
          '12': ['Matemática', 'Física', 'MEM', 'MEF','HSE','Filosofia','PSEP','Educação Física', 'Empreendedorismo'],
          '13': ['NEC', 'PAP']
        }
      },
      {
        id: '2-4',
        name: 'Pré-Escolar (PE)',
        code: 'PE',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Psicologia Geral', 'Didática Geral', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Psicologia de Desenvolvimento', 'Didática de Expressões', 'Educação Física'],
          '12': ['Língua Portuguesa', 'Matemática', 'Psicologia', 'Metodologias de Infância', 'Estágio'],
          '13': ['Prática Pedagógica', 'Trabalho de Conclusão']
        }
      },
      {
        id: '2-5',
        name: 'Biologia e Química (BQ)',
        code: 'BQ',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Biologia', 'Química','Matemática','PDA', 'Educação Física', 'Empreendedorismo'],
          '11': ['Lngua Portuguesaí', 'ASEAGE', 'Biologia', 'Química', 'MEB', 'MEQ','TEDC','PSEP','FPSD','Empreendedorismo', 'Educação Física'],
          '12': ['Biologia', 'Química', 'MEB','MEQ','HSE','PSEP','Filosofia','Empreendedorismo', 'Educação Física'],
          '13': ['NEC', 'PAP']
        }
      },
      {
        id: '2-6',
        name: 'História e Geografia (GH)',
        code: 'GH',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'História', 'Geografia','Informática','PDA','Empreendedorismo', 'Educação Física'],
          '11': ['Língua Portuguesa', 'FPSD', 'História', 'Geografia', 'MEH', 'MEG','TEDC', 'ASEAGE','PSEP','Empreendedorismo', 'Educação Física'],
          '12': ['História', 'Geografia', 'MEH','MEG','HSE','Filosofia','PSEP','Empreendedorismo', 'Educação Física'],
          '13': ['NEC', 'PAP']
        }
      },
      {
        id: '2-7',
        name: 'Português e EMC (LEMC)',
        code: 'LEMC',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa','Língua Francesa', 'Literatura','Matemática', 'PDA','NEE','Informática', 'FPSD', 'História', 'Empreendedorismo','Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa','Língua Francesa','Literatura', 'ASEAGE', 'TEDC','FPSD','MELP','MEEMC','PSEP','Empreendedorismo', 'Educação Física'],
          '12': ['Língua Portuguesa','FPSD', 'Ética','HSE','Filosofia','MELP','MEEMC','PSEP','Empreendedorismo', 'Educação Física'],
          '13': ['NEC', 'PAP']
        }
      },
      {
        id: '2-8',
        name: 'Inglês e EMC (ING_EMC)',
        code: 'ING_EMC',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'História', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Psicologia', 'Didática', 'Educação Física'],
          '12': ['Língua Inglesa', 'Didática de Inglês', 'Estágio'],
          '13': ['NEC', 'PAP']
        }
      },
      {
        id: '2-9',
        name: 'Francês e EMC (FRA_EMC)',
        code: 'FRA_EMC',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Francesa', 'Matemática', 'História', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Francesa', 'Psicologia', 'Didática', 'Educação Física'],
          '12': ['Língua Francesa', 'Didática de Francês', 'Estágio'],
          '13': ['Prática Pedagógica', 'Trabalho de Conclusão']
        }
      },
      {
        id: '2-10',
        name: 'Educação Visual e Plástica (EVP)',
        code: 'EVP',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Educação Visual', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Psicologia', 'Didática', 'Educação Física'],
          '12': ['Educação Visual', 'Didática Especial', 'Estágio'],
          '13': ['Prática Pedagógica', 'Trabalho de Conclusão']
        }
      },
      {
        id: '2-11',
        name: 'Educação Física (EDF)',
        code: 'EDF',
        disciplinesByClass: {
          '10': ['Língua Portuguesa', 'Língua Inglesa', 'Matemática', 'Educação Física'],
          '11': ['Língua Portuguesa', 'Língua Inglesa', 'Psicologia', 'Didática', 'Educação Física'],
          '12': ['Educação Física', 'Didática Especial', 'Estágio'],
          '13': ['Prática Pedagógica', 'Trabalho de Conclusão']
        }
      }
    ]
  }
];

export type AcademicSubTabType = 'DASHBOARD' | 'CURRICULO' | 'MATRICULA' | 'CANDIDATURAS' | 'RECONFIRMACAO' | 'TRANSFERIDO_ENTRADA' | 'TRANSFERIDO_SAIDA';

interface AcademicAreaProps {
  userRole: string; // ex: "DIRETOR_GERAL", "SUBDIRETOR_PEDAGOGICO", "SECRETARIO", etc.
  students?: Student[];
  grades?: GradeRow[];
  onSaveState?: (updatedStudents: Student[], updatedGrades: GradeRow[]) => void;
  schoolSettings?: any;
  onAddStudent?: (newStudent: Student) => void;
  onDeleteStudent?: (id: string) => void;
  classes?: any[];
  sections?: any[];
  loggedInStaff?: any;
  activeModality?: string;
  initialTab?: AcademicSubTabType;
  onTabChange?: (tab: AcademicSubTabType) => void;
  canEdit?: boolean;
}

export default function AcademicArea({ 
  userRole, 
  students = [], 
  grades = [], 
  onSaveState = () => {}, 
  schoolSettings,
  onAddStudent = () => {},
  onDeleteStudent = () => {},
  classes = [],
  sections = [],
  loggedInStaff = null,
  activeModality = 'PUNIV',
  initialTab = 'DASHBOARD',
  onTabChange,
  canEdit = true
}: AcademicAreaProps) {
  const [academicTab, setAcademicTab] = useState<AcademicSubTabType>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setAcademicTab(initialTab);
    }
  }, [initialTab]);

  const changeTab = (tab: AcademicSubTabType) => {
    setAcademicTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const [prefilledCandidate, setPrefilledCandidate] = useState<any>(null);
  const handleConfirmEnrollment = (cand: any) => {
    setPrefilledCandidate(cand);
    changeTab('MATRICULA');
  };
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('sigep_courses_config');
    if (saved) {
      const parsed = JSON.parse(saved) as Course[];
      // Garante que o Ensino Primário segregado esteja presente para evitar reutilizar estados de teste antigos
      if (parsed.some(c => c.code === 'ENSINO_PRIMARIO')) {
        return parsed;
      }
    }
    return INITIAL_COURSES;
  });

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [activeClassNum, setActiveClassNum] = useState<string>('10');

  // Form states
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSpecialtyCode, setNewSpecialtyCode] = useState('');
  const [newDisciplineName, setNewDisciplineName] = useState('');

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSpecialty, setShowAddSpecialty] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);

  const isDG = userRole === 'DIRETOR_GERAL' || userRole === 'DIRECTOR_GERAL' || canEdit !== false;

  useEffect(() => {
    localStorage.setItem('sigep_courses_config', JSON.stringify(courses));
  }, [courses]);

  // Se o curso selecionado for alterado externamente, atualiza a referência local
  useEffect(() => {
    if (selectedCourse) {
      const updatedCourse = courses.find(c => c.id === selectedCourse.id);
      if (updatedCourse) {
        setSelectedCourse(updatedCourse);
        if (selectedSpecialty) {
          const updatedSpec = updatedCourse.specialties.find(s => s.id === selectedSpecialty.id);
          setSelectedSpecialty(updatedSpec || null);
        }
      }
    }
  }, [courses, selectedCourse, selectedSpecialty]);

  // Garante que a classe ativa corresponda às opções válidas do curso selecionado
  useEffect(() => {
    if (selectedCourse) {
      const allowedClasses = selectedCourse.code === 'ENSINO_PRIMARIO'
        ? ['1', '2', '3', '4', '5', '6', '7', '8', '9']
        : selectedCourse.code === 'MAGISTERIO'
          ? ['10', '11', '12', '13']
          : ['10', '11', '12'];
      if (!allowedClasses.includes(activeClassNum)) {
        setActiveClassNum(allowedClasses[0]);
      }
    }
  }, [selectedCourse, activeClassNum]);

  const handleToggleCourse = (courseId: string) => {
    if (!isDG) {
      setShowPermissionAlert(true);
      return;
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    }));
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDG) {
      setShowPermissionAlert(true);
      return;
    }
    if (!newCourseName.trim() || !newCourseCode.trim()) return;

    const newCourse: Course = {
      id: Date.now().toString(),
      name: newCourseName.trim(),
      code: newCourseCode.trim().toUpperCase(),
      isActive: true,
      specialties: []
    };

    setCourses(prev => [...prev, newCourse]);
    setNewCourseName('');
    setNewCourseCode('');
    setShowAddCourse(false);
  };

  const handleAddSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDG) {
      setShowPermissionAlert(true);
      return;
    }
    if (!selectedCourse) return;
    if (!newSpecialtyName.trim() || !newSpecialtyCode.trim()) return;

    const defaultClasses: { [key: string]: string[] } = {};
    if (selectedCourse.code === 'ENSINO_PRIMARIO') {
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(cl => {
        defaultClasses[cl] = [];
      });
    } else if (selectedCourse.code === 'MAGISTERIO') {
      ['10', '11', '12', '13'].forEach(cl => {
        defaultClasses[cl] = [];
      });
    } else {
      ['10', '11', '12'].forEach(cl => {
        defaultClasses[cl] = [];
      });
    }

    const newSpec: Specialty = {
      id: `${selectedCourse.id}-${Date.now()}`,
      name: newSpecialtyName.trim(),
      code: newSpecialtyCode.trim().toUpperCase(),
      disciplinesByClass: defaultClasses
    };

    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourse.id) {
        return {
          ...c,
          specialties: [...c.specialties, newSpec]
        };
      }
      return c;
    }));

    setNewSpecialtyName('');
    setNewSpecialtyCode('');
    setShowAddSpecialty(false);
  };

  const handleAddDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDG) {
      setShowPermissionAlert(true);
      return;
    }
    if (!selectedCourse || !selectedSpecialty || !newDisciplineName.trim()) return;

    const disciplineName = newDisciplineName.trim();

    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourse.id) {
        return {
          ...c,
          specialties: c.specialties.map(s => {
            if (s.id === selectedSpecialty.id) {
              const currentClassDisciplines = s.disciplinesByClass[activeClassNum] || [];
              if (currentClassDisciplines.includes(disciplineName)) {
                alert('Esta disciplina já existe nesta classe!');
                return s;
              }
              return {
                ...s,
                disciplinesByClass: {
                  ...s.disciplinesByClass,
                  [activeClassNum]: [...currentClassDisciplines, disciplineName]
                }
              };
            }
            return s;
          })
        };
      }
      return c;
    }));

    setNewDisciplineName('');
  };

  const handleRemoveDiscipline = (disciplineName: string) => {
    if (!isDG) {
      setShowPermissionAlert(true);
      return;
    }
    if (!selectedCourse || !selectedSpecialty) return;

    const confirm = window.confirm(`Tem certeza de que deseja remover a disciplina "${disciplineName}" da grade curricular?`);
    if (!confirm) return;

    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourse.id) {
        return {
          ...c,
          specialties: c.specialties.map(s => {
            if (s.id === selectedSpecialty.id) {
              const currentClassDisciplines = s.disciplinesByClass[activeClassNum] || [];
              return {
                ...s,
                disciplinesByClass: {
                  ...s.disciplinesByClass,
                  [activeClassNum]: currentClassDisciplines.filter(d => d !== disciplineName)
                }
              };
            }
            return s;
          })
        };
      }
      return c;
    }));
  };

  if (academicTab === 'DASHBOARD') {
    return (
      <div className="space-y-6 animate-fadeIn p-1">
        {/* Banner de Permissão do MED */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider">Gestão e Planeamento - Área Académica</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Selecione o módulo de trabalho para gestão de matrículas, cursos e percursos escolares.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-850 border border-slate-800 text-[10px] font-black tracking-wider uppercase">
            {isDG ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Modo Administrador Geral</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400">Modo de Consulta Escolar</span>
              </>
            )}
          </div>
        </div>

        {/* Módulos de Trabalho - Janelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: CANDIDATURAS */}
          <div 
            onClick={() => changeTab('CANDIDATURAS')}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-500 transition-all duration-350">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2 py-0.5 rounded-md">1ª Posição</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-amber-700 transition-colors mt-1">
                  CANDIDATURAS
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Gestão integrada do fluxo de admissão: Candidatura, Prova de Acesso, Seleção por Mérito e Vinculação Final.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-amber-600">
              <span className="uppercase tracking-wider">Gestão d'Admissões</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Matrícula */}
          <div 
            onClick={() => changeTab('MATRICULA')}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-350">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">2ª Posição</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-indigo-650 transition-colors mt-1">
                  Matrícula Regular
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Registo reservado a novos alunos selecionados e aprovados na candidatura.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-indigo-600">
              <span className="uppercase tracking-wider">Fazer Matrícula</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Reconfirmação de Matrícula */}
          <div 
            onClick={() => changeTab('RECONFIRMACAO')}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-350">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">3ª Posição</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-blue-700 transition-colors mt-1">
                  Reconfirmação
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Exclusivo para alunos internos promovidos e deslocados para a classe posterior.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-blue-600">
              <span className="uppercase tracking-wider">Reconfirmar Aluno</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Entrada por Transferência */}
          <div 
            onClick={() => changeTab('TRANSFERIDO_ENTRADA')}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-teal-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-100 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-500 transition-all duration-350">
                <MoveRight className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-teal-700 tracking-widest bg-teal-50 px-2 py-0.5 rounded-md">Transferência (Entrada)</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-teal-700 transition-colors mt-1">
                  Entrada por Transferência
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Integre e matricule alunos vindos transferidos de outras instituições de ensino oficiais.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-teal-600">
              <span className="uppercase tracking-wider">Registar Entrada</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 5: Saída por Transferência */}
          <div 
            onClick={() => changeTab('TRANSFERIDO_SAIDA')}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-rose-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-500 transition-all duration-350">
                <MoveLeft className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-rose-700 tracking-widest bg-rose-50 px-2 py-0.5 rounded-md">Transferência (Saída)</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-rose-700 transition-colors mt-1">
                  Saída por Transferência
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Emita guias de transferência e registe a desvinculação oficial de alunos transferidos.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-rose-600">
              <span className="uppercase tracking-wider">Registar Saída</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 6: Estrutura Curricular */}
          <div 
            onClick={() => changeTab('CURRICULO')}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100 group-hover:bg-sky-650 group-hover:text-white group-hover:border-sky-500 transition-all duration-350">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-sky-600 tracking-widest bg-sky-50 px-2 py-0.5 rounded-md">Matriz Curricular</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-sky-700 transition-colors mt-1">
                  Estrutura Curricular
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Matrizes curriculares de disciplinas, cursos e especialidades do Ministério.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-sky-600">
              <span className="uppercase tracking-wider">Configurar Cursos</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn p-1">
      {/* Botão de Voltar e Breadcrumb */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-3xs">
        <button
          onClick={() => changeTab('DASHBOARD')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-indigo-650 transition-all cursor-pointer text-[10.5px] font-black uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Menu Académico</span>
        </button>
        <div className="text-[10px] font-bold text-slate-450 font-mono uppercase tracking-widest hidden sm:block">
          Área Académica &gt; <span className="text-indigo-600 font-black">{
            academicTab === 'CURRICULO' ? 'Estrutura Curricular & Cursos' :
            academicTab === 'MATRICULA' ? 'Ficha de Matrícula (Novos)' :
            academicTab === 'RECONFIRMACAO' ? 'Reconfirmação de Matrícula (Internos)' :
            academicTab === 'TRANSFERIDO_ENTRADA' ? 'Entrada por Transferência' :
            academicTab === 'TRANSFERIDO_SAIDA' ? 'Saída por Transferência' :
            'Candidaturas (Processo de Admissão)'
          }</span>
        </div>
      </div>

      {academicTab === 'MATRICULA' && (
        <PainelMatriculas
          students={students}
          onAddStudent={onAddStudent}
          onDeleteStudent={onDeleteStudent}
          classes={classes}
          sections={sections}
          userRole={userRole as any}
          loggedInStaff={loggedInStaff}
          activeModality={activeModality as any}
          initialPrefilledCandidate={prefilledCandidate}
          onClearPrefilledCandidate={() => setPrefilledCandidate(null)}
          defaultActiveAba="REGULAR"
          schoolSettings={schoolSettings}
          canEdit={canEdit}
        />
      )}

      {academicTab === 'RECONFIRMACAO' && (
        <PainelMatriculas
          students={students}
          onAddStudent={onAddStudent}
          onDeleteStudent={onDeleteStudent}
          classes={classes}
          sections={sections}
          userRole={userRole as any}
          loggedInStaff={loggedInStaff}
          activeModality={activeModality as any}
          defaultActiveAba="RECONFIRMACAO"
          schoolSettings={schoolSettings}
          canEdit={canEdit}
        />
      )}

      {academicTab === 'TRANSFERIDO_ENTRADA' && (
        <PainelMatriculas
          students={students}
          onAddStudent={onAddStudent}
          onDeleteStudent={onDeleteStudent}
          classes={classes}
          sections={sections}
          userRole={userRole as any}
          loggedInStaff={loggedInStaff}
          activeModality={activeModality as any}
          defaultActiveAba="TRANSFERIDO_ENTRADA"
          schoolSettings={schoolSettings}
          canEdit={canEdit}
        />
      )}

      {academicTab === 'TRANSFERIDO_SAIDA' && (
        <PainelMatriculas
          students={students}
          onAddStudent={onAddStudent}
          onDeleteStudent={onDeleteStudent}
          classes={classes}
          sections={sections}
          userRole={userRole as any}
          loggedInStaff={loggedInStaff}
          activeModality={activeModality as any}
          defaultActiveAba="TRANSFERIDO_SAIDA"
          schoolSettings={schoolSettings}
          canEdit={canEdit}
        />
      )}

      {academicTab === 'CANDIDATURAS' && (
        <PainelMatriculas
          students={students}
          onAddStudent={onAddStudent}
          onDeleteStudent={onDeleteStudent}
          classes={classes}
          sections={sections}
          userRole={userRole as any}
          loggedInStaff={loggedInStaff}
          activeModality={activeModality as any}
          initialPrefilledCandidate={prefilledCandidate}
          onClearPrefilledCandidate={() => setPrefilledCandidate(null)}
          defaultActiveAba="PROCESSO_ADMISSAO"
          schoolSettings={schoolSettings}
          canEdit={canEdit}
        />
      )}

      {academicTab === 'CURRICULO' && (
        /* Grid Principal */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: CURSOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cursos Escolares</h4>
            </div>
            {isDG && (
              <button
                onClick={() => setShowAddCourse(!showAddCourse)}
                className="p-1 rounded-lg hover:bg-slate-100 text-indigo-600 transition-colors cursor-pointer"
                title="Cadastrar Novo Curso"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {showAddCourse && isDG && (
            <form onSubmit={handleAddCourse} className="p-3 bg-slate-50 border border-indigo-100 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="text-[10px] font-black text-indigo-950 uppercase">Cadastrar Novo Curso</div>
              <div>
                <input
                  type="text"
                  placeholder="Nome do Curso (ex: Ensino Geral)"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Sigla/Código (ex: PUNIV)"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Gravar Curso
              </button>
            </form>
          )}

          <div className="space-y-2.5 flex-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {courses.map(course => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <div 
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    setSelectedSpecialty(null);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                    isSelected 
                      ? 'bg-indigo-50/50 border-indigo-200/85' 
                      : 'bg-slate-50/40 border-slate-200/60 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${course.isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-extrabold ${course.isActive ? 'text-slate-900' : 'text-slate-400'}`}>{course.name}</span>
                        <span className="text-[9px] font-mono font-black bg-slate-100 px-1 py-0.5 rounded text-slate-500">{course.code}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{course.specialties.length} Especialidades cadastradas</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleCourse(course.id)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      title={course.isActive ? 'Desativar Curso' : 'Ativar Curso'}
                    >
                      {course.isActive ? (
                        <ToggleRight className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-350" />
                      )}
                    </button>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'transform translate-x-1 text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 2: ESPECIALIDADES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Especialidades do Curso</h4>
            </div>
            {isDG && selectedCourse && (
              <button
                onClick={() => setShowAddSpecialty(!showAddSpecialty)}
                className="p-1 rounded-lg hover:bg-slate-100 text-emerald-600 transition-colors cursor-pointer"
                title="Adicionar Especialidade"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {!selectedCourse ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-center">
              <Layers className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Selecione um curso na coluna esquerda para carregar as suas especialidades.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Curso: <strong className="text-indigo-900">{selectedCourse.name}</strong></div>
              
              {showAddSpecialty && isDG && (
                <form onSubmit={handleAddSpecialty} className="p-3 bg-slate-50 border border-emerald-100 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="text-[10px] font-black text-emerald-950 uppercase">Nova Especialidade</div>
                  <div>
                    <input
                      type="text"
                      placeholder="Nome da Especialidade (ex: Ciências Sociais)"
                      value={newSpecialtyName}
                      onChange={(e) => setNewSpecialtyName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Código/Sigla (ex: CS)"
                      value={newSpecialtyCode}
                      onChange={(e) => setNewSpecialtyCode(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-bold"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Gravar Especialidade
                  </button>
                </form>
              )}

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {selectedCourse.specialties.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Nenhuma especialidade cadastrada para este curso escolar.
                  </div>
                ) : (
                  selectedCourse.specialties.map(spec => {
                    const isSelected = selectedSpecialty?.id === spec.id;
                    return (
                      <div
                        key={spec.id}
                        onClick={() => setSelectedSpecialty(spec)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                          isSelected 
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : 'bg-slate-50/40 border-slate-200/60 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-800">{spec.name}</div>
                            <span className="text-[9px] font-mono font-black bg-slate-100 px-1 py-0.5 rounded text-slate-500 uppercase">{spec.code}</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA 3: MATRIZ CURRICULAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Matriz de Disciplinas</h4>
            </div>
          </div>

          {!selectedSpecialty ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Selecione uma Especialidade na coluna do meio para gerir a sua matriz curricular.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Especialidade: <strong className="text-emerald-800">{selectedSpecialty.name}</strong></div>
              
              {/* Seletor de Classe Acadêmica */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
                {(selectedCourse?.code === 'ENSINO_PRIMARIO'
                  ? ['1', '2', '3', '4', '5', '6', '7', '8', '9']
                  : selectedCourse?.code === 'MAGISTERIO'
                    ? ['10', '11', '12', '13']
                    : ['10', '11', '12']
                ).map(cl => {
                  const isActive = activeClassNum === cl;
                  return (
                    <button
                      key={cl}
                      onClick={() => setActiveClassNum(cl)}
                      className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-white text-indigo-950 shadow-2xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cl}ª Classe
                    </button>
                  );
                })}
              </div>

              {/* Formulário de Adicionar Disciplina (DG ONLY) */}
              {isDG ? (
                <form onSubmit={handleAddDiscipline} className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Adicionar nova disciplina..."
                    value={newDisciplineName}
                    onChange={(e) => setNewDisciplineName(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl px-3.5 py-2 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                    title="Adicionar Disciplina na Matriz"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-[10px] font-semibold flex items-start gap-1.5 leading-normal shrink-0">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>Apenas o Diretor Geral possui permissão para retirar ou adicionar novas disciplinas nesta matriz curricular escolar.</span>
                </div>
              )}

              {/* Lista de Disciplinas na Matriz */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/40 p-3 flex-1 max-h-[35vh] overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Grade Curricular ({activeClassNum}ª Classe):</div>
                
                {(() => {
                  const list = selectedSpecialty.disciplinesByClass[activeClassNum] || [];
                  if (list.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs font-medium">
                        Nenhuma disciplina cadastrada para esta classe.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5 animate-fadeIn">
                      {list.map(disc => {
                        return (
                          <div 
                            key={disc}
                            className="bg-white border border-slate-200/50 p-2.5 rounded-lg flex justify-between items-center text-xs font-semibold text-slate-700"
                          >
                            <span>{disc}</span>
                            {isDG && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDiscipline(disc)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remover Disciplina"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </div>

      </div>
      )}

      {/* MODAL DE ALERTA DE PERMISSÃO NEGADA */}
      {showPermissionAlert && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl w-full max-w-md p-6 text-center space-y-4 animate-scaleIn">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-rose-950">Acesso Restrito ao Diretor Geral</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                Lamentamos, mas de acordo com as normas institucionais do SIGEP, a alteração de cursos, especialidades e a inserção ou exclusão de disciplinas na matriz curricular é de competência exclusiva do <strong>Diretor Geral</strong> da escola.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionAlert(false)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all shadow-xs"
              >
                Compreendi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

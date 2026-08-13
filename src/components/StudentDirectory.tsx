/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, UserRole, Staff, ModalityType } from '../types';
import { formatarNomeProprio } from '../utils/pautaLogic';
import { PlusCircle, Search, Trash2, UserPlus, Filter, Hash, ChevronDown, ChevronUp, User, Phone, MapPin, Calendar, FileText, RefreshCw, Edit, X } from 'lucide-react';
import { generateStudentId, isStudentVisibleForProfessor, getProfessorAllowedClasses, getProfessorAllowedSections } from '../utils';
import BiSectorSelect from './BiSectorSelect';

const LOCALIDADES_ANGOLA: { [key: string]: string[] } = {
  'Bengo': [
    'Dande',
    'Ambriz',
    'Barra do Dande',
    'Nambuangongo',
    'Panguila',
    'Quibaxe',
    'Muxaluando',
    'Bula Atumba',
    'Pango Aluquém',
    'Piri',
    'Quicunzo',
    'Úcua'
  ],
  'Benguela': [
    'Benguela',
    'Lobito',
    'Catumbela',
    'Cubal',
    'Baía Farta',
    'Ganda',
    'Navegantes',
    'Balombo',
    'Bocoio',
    'Chongorói',
    'Caimbambo',
    'Biópio',
    'Bolonguera',
    'Catengue',
    'Chila',
    'Chicuma',
    'Iambala',
    'Babaera',
    'Canhamela',
    'Chindumbo',
    'Egito Praia',
    'Dombe Grande',
    'Capupa'
  ],
  'Bié': [
    'Andulo',
    'Cuito',
    'Camacupa',
    'Nharêja',
    'Chinguar',
    'Chitembo',
    'Catabola',
    'Cunhinga',
    'Cuemba',
    'Calucinga',
    'Chicala',
    'Chipeta',
    'Luando',
    'Ringoma',
    'Úmpulo',
    'Cambândua',
    'Lúbia',
    'Mumbué',
    'Belo Horizonte'
  ],
  'Cabinda': [
    'Cabinda',
    'Cacongo',
    'Buco Zau',
    'Liambo',
    'Belize',
    'Ngoio',
    'Massabi',
    'Miconje',
    'Necuto',
    'Tando Zinze'
  ],
  'Cuando': [
    'Mavinga',
    'Cuito Cuanavale',
    'Dirico',
    'Rivungo',
    'Luiana',
    'Mucusso',
    'Xipundo',
    'Dima',
    'Luengue'
  ],
  'Cuanza-Norte': [
    'Cazengo',
    'Cambambe',
    'Golungo Alto',
    'Ambaca',
    'Banga',
    'Bolongongo',
    'Lucala',
    'Quiculungo',
    'Samba Caju',
    'Ngonguembo',
    'Aldeia Nova',
    'Caculo Cabaça',
    'Cêrca',
    'Luinga',
    'Massangano',
    'Tango',
    'Terreiro'
  ],
  'Cuanza-Sul': [
    'Gabela',
    'Sumbe',
    'Porto Amboim',
    'Quibala',
    'Seles',
    'Waku Kungo',
    'Gangula',
    'Calulo',
    'Cassongue',
    'Mussende',
    'Ebo',
    'Condé',
    'Conda',
    'Quilenda',
    'Boa Entrada',
    'Pambangala',
    'Amboíva',
    'Lonhe',
    'Munenga',
    'Quissongo',
    'Quenha',
    'Quirimbo',
    'Sanga',
    'Gungo'
  ],
  'Cubango': [
    'Menongue',
    'Cuchi',
    'Caiundo',
    'Savate',
    'Calai',
    'Cuangar',
    'Nancova',
    'Cutato',
    'Chingoanja',
    'Mavengue',
    'Longa'
  ],
  'Cunene': [
    'Cuanhama',
    'Namacunde',
    'Ombadja',
    'Cahama',
    'Curoca',
    'Cuvelai',
    'Chissuata',
    'Mupa',
    'Nautila',
    'Cafima',
    'Mucope',
    'Nehone',
    'Chitado',
    'Chiêde'
  ],
  'Huambo': [
    'Bailundo',
    'Caála',
    'Huambo',
    'Cachiungo',
    'Chicala Choloanga',
    'Londuimbali',
    'Mungo',
    'Chinjenje',
    'Ecunha',
    'Ucuma',
    'Longonjo',
    'Alto Hama',
    'Cuima',
    'Bimbe',
    'Chilata',
    'Galanga',
    'Sambo'
  ],
  'Huila': [
    'Lubango',
    'Matala',
    'Caconda',
    'Caluquembe',
    'Chibia',
    'Humpata',
    'Cacula',
    'Chicomba',
    'Jamba Mineira',
    'Quipungo',
    'Hoque',
    'Palanca',
    'Chipindo',
    'Cuvango',
    'Gambos',
    'Quilengues',
    'Capunda Cavilongo',
    'Dongo',
    'Galangue',
    'Capelongo',
    'Chituto',
    'Viti Vivali',
    'Chicungo'
  ],
  'Icolo e Bengo': [
    'Catete',
    'Calumbo',
    'Sequele',
    'Bom Jesus',
    'Quiçama',
    'Cabo Ledo',
    'Cabiri'
  ],
  'Luanda': [
    'Cacuaco',
    'Cazenga',
    'Kilamba Kiaxi',
    'Ingombota',
    'Viana',
    'Talatona',
    'Maianga',
    'Rangel',
    'Samba',
    'Sambizanga',
    'Hoji ya Henda',
    'Kilamba',
    'Belas',
    'Camama',
    'Mulenvos',
    'Mussulo'
  ],
  'Lunda-Norte': [
    'Dundo',
    'Chitato',
    'Cuango',
    'Lucapa',
    'Mussungue',
    'Cafunfo',
    'Cambulo',
    'Capenda Camulemba',
    'Caungula',
    'Cuilo',
    'Lóvua',
    'Lubalo',
    'Xá Muteba',
    'Cassanje Calucala',
    'Luangue',
    'Xá Cassau',
    'Luremo',
    'Camaxilo',
    'Canzar'
  ],
  'Lunda-Sul': [
    'Saurimo',
    'Muconda',
    'Cassengo',
    'Cacolo',
    'Dala',
    'Muangueji',
    'Alto Chicapa',
    'Cazage',
    'Chihuage',
    'Luma Cassai',
    'Sombo',
    'Muriege',
    'Xassengue',
    'Cassai - Sul'
  ],
  'Malanje': [
    'Malanje',
    'Calandula',
    'Cacuso',
    'Cangandala',
    'Cambundi Catembo',
    'Cahombo',
    'Kiwaba Nzoji',
    'Kunda dya Baze',
    'Quela',
    'Massango',
    'Marimba',
    'Quirima',
    'Caculama',
    'Luquembo',
    'Cambo Suinginge',
    'Cateco Cangola',
    'Mbanji ya Ngola',
    'Muquixe',
    'Pungu a Ndongo',
    'Ngola Luiji',
    'Quihuhu',
    'Quitapa',
    'Xandel',
    'Capunda',
    'Cuale',
    'Milando',
    'Quêssua'
  ],
  'Moxico': [
    'Luena',
    'Lumbala Nguimbo',
    'Camanongue',
    'Cangamba',
    'Léua',
    'Alto Cuito',
    'Cangumbe',
    'Chiume',
    'Lucusse',
    'Lutembo',
    'Lutuai',
    'Ninda'
  ],
  'Moxico Leste': [
    'Cazombo',
    'Luau',
    'Cameia',
    'Luacano',
    'Lago Dilolo',
    'Nana Candundo',
    'Caianda',
    'Macondo',
    'Lóvua do Zambeze'
  ],
  'Namibe': [
    'Moçâmedes',
    'Tômbwa',
    'Bibala',
    'Sacomar',
    'Camucuio',
    'Virei',
    'Cacimbas',
    'Iona',
    'Lucira'
  ],
  'Uige': [
    'Uige',
    'Maquela do Zombo',
    'Negage',
    'Damba',
    'Cangola',
    'Bembe',
    'Ambuila',
    'Dange Quitexe',
    'Milunga',
    'Mucaba',
    'Sanza Pombo',
    'Puri',
    'Quimbele',
    'Songo',
    'Nova Esperança',
    'Bungo',
    'Lucunga',
    'Quipedro',
    'Vista Alegre',
    'Alto Zaza',
    'Nsoso',
    'Sacandica',
    'Massau'
  ],
  'Zaire': [
    'Mbanza Kongo',
    'Soyo',
    'Luvo',
    'Nóqui',
    'Nzeto',
    'Cuimba',
    'Tomboco',
    'Lufico',
    'Quêlo',
    'Quindeje',
    'Serra de Canda'
  ]
};

interface StudentDirectoryProps {
  students: Student[];
  onAddStudent: (newStudent: Student) => void;
  onDeleteStudent: (id: string) => void;
  onClearAllStudents?: () => void;
  classes: string[];
  sections: string[];
  userRole?: UserRole;
  loggedInStaff?: Staff | null;
  activeModality?: ModalityType;
}

export default function StudentDirectory({
  students,
  onAddStudent,
  onDeleteStudent,
  onClearAllStudents,
  classes,
  sections,
  userRole = 'SUB_DIRECTOR_PEDAGOGICO',
  loggedInStaff = null,
  activeModality = 'ENSINO_PRIMARIO'
}: StudentDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  // Reset filters and new inputs when activeModality changes due to modality switch in the top menu
  React.useEffect(() => {
    setSelectedClass('All');
    setSelectedSection('All');
    setNewClass('');
    setNewSection('');
  }, [activeModality]);
  
  // New student form state
  const [isAdding, setIsAdding] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F' | ''>('');
  const [newClass, setNewClass] = useState<string>('');
  const [newSection, setNewSection] = useState<string>('');
  const [newForeignLanguage, setNewForeignLanguage] = useState<'INGLÊS' | 'FRANCÊS'>('INGLÊS');
  const [newSpecialty, setNewSpecialty] = useState<string>('');
  const [isTransferidoEntrada, setIsTransferidoEntrada] = useState(false);
  const [isTransferidoSaida, setIsTransferidoSaida] = useState(false);
  const [isConfirmingClearForm, setIsConfirmingClearForm] = useState(false);
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(null);
  const [isTransferManagerOpen, setIsTransferManagerOpen] = useState(false);
  const [transferFilterClass, setTransferFilterClass] = useState<string>('All');
  const [transferFilterSection, setTransferFilterSection] = useState<string>('All');
  const [transferSearch, setTransferSearch] = useState<string>('');
  const [filterTransferidos, setFilterTransferidos] = useState<'ATIVOS' | 'TRANSFERIDOS_SAIDA' | 'TODOS'>('ATIVOS');

  const isPUNIV = activeModality === 'PUNIV';
  const isMagisterio = activeModality === 'MAGISTERIO';

  const isNivel3 = (cls: string) => {
    const num = parseInt(cls, 10);
    return num >= 7;
  };
  
  const showLangSelectorInDirectory = (cls: string) => {
    if (isMagisterio) return false;
    const classNum = parseInt(cls, 10);
    if (isPUNIV) {
      return classNum >= 10 && classNum <= 12;
    }
    return classNum >= 7 && classNum <= 9;
  };
  
  // Custom Registration inputs
  const [newFatherName, setNewFatherName] = useState('');
  const [newMotherName, setNewMotherName] = useState('');
  const [newBi, setNewBi] = useState('');
  const [newBiSector, setNewBiSector] = useState('');
  const [newBiDate, setNewBiDate] = useState('');
  const [newDocType, setNewDocType] = useState<'BI' | 'CEDULA'>('BI');
  const [newCedulaRegisto, setNewCedulaRegisto] = useState('');
  const [newCedulaFls, setNewCedulaFls] = useState('');
  const [newCedulaLivro, setNewCedulaLivro] = useState('');
  const [newCedulaAno, setNewCedulaAno] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPeriod, setNewPeriod] = useState<string>('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newNaturalidade, setNewNaturalidade] = useState('');
  const [currentFormStep, setCurrentFormStep] = useState(1);
  
  const [formError, setFormError] = useState('');

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const startEditingStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setIsAdding(true);
    setCurrentFormStep(1);
    setFormError('');
    
    // Populate form fields
    setNewId(student.id);
    setNewName(student.name);
    setNewGender(student.gender);
    setNewClass(student.class);
    setNewSection(student.section);
    setNewSpecialty(student.specialty || '');
    setNewPeriod(student.periodo || '');
    setNewDocType(student.docType || 'BI');
    setNewBi(student.bi || '');
    setNewBiSector(student.biSector || '');
    setNewBiDate(student.biDate || '');
    setNewCedulaRegisto(student.cedulaRegisto || '');
    setNewCedulaFls(student.cedulaFls || '');
    setNewCedulaLivro(student.cedulaLivro || '');
    setNewCedulaAno(student.cedulaAno || '');
    setNewFatherName(student.fatherName || '');
    setNewMotherName(student.motherName || '');
    setNewContact(student.contact || '');
    setNewBirthDate(student.birthDate || '');
    setNewProvince(student.province || '');
    setNewNaturalidade(student.naturalidade || '');
    setNewForeignLanguage(student.foreignLanguage || 'INGLÊS');
    setIsTransferidoEntrada(student.isTransferidoEntrada || false);
    setIsTransferidoSaida(student.isTransferidoSaida || false);
  };

  const calculateAge = (dateString: string): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  const handleProvinceChange = (provinceName: string) => {
    setNewProvince(provinceName);
    setNewNaturalidade('');
  };

  React.useEffect(() => {
    if (isAdding && !editingStudentId) {
      autofillId();
    }
  }, [newName, newClass, newSection, isAdding, editingStudentId]);

  const filteredStudents = students.filter(student => {
    // If professor, they can only view students of classes, sections and subjects assigned to their ID
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      if (!isStudentVisibleForProfessor(student, loggedInStaff)) {
        return false;
      }
    }

    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.id.toUpperCase().includes(searchTerm.toUpperCase()) ||
                          (student.guiaTransferenciaEntrada && student.guiaTransferenciaEntrada.toUpperCase().includes(searchTerm.toUpperCase())) ||
                          (student.guiaTransferenciaSaida && student.guiaTransferenciaSaida.toUpperCase().includes(searchTerm.toUpperCase())) ||
                          (student.biNumber && student.biNumber.toUpperCase().includes(searchTerm.toUpperCase()));
    const matchesClass = selectedClass === 'All' || student.class === selectedClass;
    const matchesSection = selectedSection === 'All' || student.section === selectedSection;
    
    // Transfer check filter
    if (filterTransferidos === 'ATIVOS' && student.isTransferidoSaida) {
      return false;
    }
    if (filterTransferidos === 'TRANSFERIDOS_SAIDA' && !student.isTransferidoSaida) {
      return false;
    }

    return matchesSearch && matchesClass && matchesSection;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive multi-step validation check
    if (!newName.trim()) {
      setCurrentFormStep(1);
      setFormError('Por favor, preencha o Nome Completo do Aluno na Secção 1.');
      return;
    }

    if (!newGender) {
      setCurrentFormStep(1);
      setFormError('Por favor, selecione o Género / Sexo do Aluno na Secção 1 (campo obrigatório).');
      return;
    }

    if (!newClass) {
      setCurrentFormStep(1);
      setFormError('Por favor, selecione a Classe na Secção 1 (campo obrigatório).');
      return;
    }

    if (!newSection) {
      setCurrentFormStep(1);
      setFormError('Por favor, selecione a Turma na Secção 1 (campo obrigatório).');
      return;
    }

    if ((isPUNIV || isMagisterio) && !newSpecialty) {
      setCurrentFormStep(1);
      setFormError('Por favor, selecione a Especialidade / Curso na Secção 1 (campo obrigatório).');
      return;
    }

    if (!newPeriod) {
      setCurrentFormStep(1);
      setFormError('Por favor, selecione o Período Letivo na Secção 1 (campo obrigatório).');
      return;
    }

    if (newDocType === 'BI') {
      if (!newBi.trim()) {
        setCurrentFormStep(1);
        setFormError('Por favor, preencha o número do B.I. na Secção 1 (campo obrigatório).');
        return;
      }

      const biReg = /^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/;
      if (!biReg.test(newBi.trim())) {
        setCurrentFormStep(1);
        setFormError('O B.I. deve ter exatamente 14 caracteres no formato oficial de Angola (9 números, 2 letras, 3 números - Ex: 005580255LN078).');
        return;
      }

      if (!newBiSector.trim()) {
        setCurrentFormStep(1);
        setFormError('Por favor, preencha o Sector de Emissão do B.I. na Secção 1 (campo obrigatório).');
        return;
      }

      if (!newBiDate) {
        setCurrentFormStep(1);
        setFormError('Por favor, selecione a Data de Emissão do B.I. na Secção 1 (campo obrigatório).');
        return;
      }
    } else {
      if (!newCedulaRegisto.trim()) {
        setCurrentFormStep(1);
        setFormError('Por favor, preencha o Nº de Registo da Cédula na Secção 1 (campo obrigatório).');
        return;
      }
      if (newCedulaRegisto.trim().length > 12) {
        setCurrentFormStep(1);
        setFormError('O Nº de Registo da Cédula não pode ultrapassar 12 dígitos.');
        return;
      }
      if (!newCedulaFls.trim()) {
        setCurrentFormStep(1);
        setFormError('Por favor, preencha o Nº da folha (fls) da Cédula na Secção 1 (campo obrigatório).');
        return;
      }
      if (newCedulaFls.trim().length > 10) {
        setCurrentFormStep(1);
        setFormError('A folha (fls) da Cédula não pode ultrapassar 10 dígitos.');
        return;
      }
      if (!newCedulaLivro.trim()) {
        setCurrentFormStep(1);
        setFormError('Por favor, preencha o Livro nº da Cédula na Secção 1 (campo obrigatório).');
        return;
      }
      if (newCedulaLivro.trim().length > 5) {
        setCurrentFormStep(1);
        setFormError('O Livro nº da Cédula não pode ultrapassar 5 dígitos.');
        return;
      }
      if (!newCedulaAno.trim()) {
        setCurrentFormStep(1);
        setFormError('Por favor, preencha o Ano de emissão da Cédula na Secção 1 (campo obrigatório).');
        return;
      }
      const yearVal = parseInt(newCedulaAno.trim(), 10);
      if (isNaN(yearVal) || newCedulaAno.trim().length !== 4) {
        setCurrentFormStep(1);
        setFormError('O Ano de emissão da Cédula deve ser um ano válido com exatamente 4 dígitos (Ex: 2026).');
        return;
      }
    }
    
    if (!newFatherName.trim()) {
      setCurrentFormStep(2);
      setFormError('Por favor, preencha o Nome Completo do Pai na Secção 2.');
      return;
    }

    if (!newMotherName.trim()) {
      setCurrentFormStep(2);
      setFormError('Por favor, preencha o Nome Completo da Mãe na Secção 2.');
      return;
    }

    if (!newContact.trim()) {
      setCurrentFormStep(3);
      setFormError('Por favor, insira o Contacto Telefónico na Secção 3.');
      return;
    }

    if (!newBirthDate) {
      setCurrentFormStep(3);
      setFormError('Por favor, selecione a Data de Nascimento na Secção 3.');
      return;
    }

    if (!newProvince) {
      setCurrentFormStep(3);
      setFormError('Por favor, selecione a Província de Angola (campo obrigatório) na Secção 3.');
      return;
    }

    if (!newNaturalidade) {
      setCurrentFormStep(3);
      setFormError('Por favor, selecione o Município (campo obrigatório) na Secção 3.');
      return;
    }

    // Check limit of 75 students per class (excluding the one being edited)
    const studentsInClass = students.filter(s => s.class === newClass && s.section === newSection && s.id !== editingStudentId);
    if (studentsInClass.length >= 75) {
      setCurrentFormStep(1);
      setFormError(`Limite atingido! A ${newClass}ª Classe - Turma ${newSection} já possui o limite máximo de 75 alunos cadastrados.`);
      return;
    }

    const candidateId = editingStudentId || generateStudentId(newName, newClass, newSection, students.map(s => s.id));

    onAddStudent({
      id: candidateId,
      name: formatarNomeProprio(newName),
      gender: newGender,
      class: newClass,
      section: newSection,
      fatherName: formatarNomeProprio(newFatherName),
      motherName: formatarNomeProprio(newMotherName),
      docType: newDocType,
      bi: newDocType === 'BI' ? newBi.trim() : undefined,
      biSector: newDocType === 'BI' ? newBiSector.trim() : undefined,
      biDate: newDocType === 'BI' ? newBiDate : undefined,
      cedulaRegisto: newDocType === 'CEDULA' ? newCedulaRegisto.trim() : undefined,
      cedulaFls: newDocType === 'CEDULA' ? newCedulaFls.trim() : undefined,
      cedulaLivro: newDocType === 'CEDULA' ? newCedulaLivro.trim() : undefined,
      cedulaAno: newDocType === 'CEDULA' ? newCedulaAno.trim() : undefined,
      province: newProvince,
      naturalidade: newNaturalidade,
      birthDate: newBirthDate,
      contact: newContact.trim(),
      periodo: newPeriod as any,
      age: calculateAge(newBirthDate),
      foreignLanguage: isNivel3(newClass) ? newForeignLanguage : undefined,
      specialty: (isPUNIV || isMagisterio) ? (newSpecialty as any) : undefined,
      isTransferidoEntrada: isTransferidoEntrada,
      isTransferidoSaida: isTransferidoSaida,
      dataTransferenciaSaida: isTransferidoSaida ? (editingStudentId ? (students.find(s => s.id === editingStudentId)?.dataTransferenciaSaida || new Date().toLocaleDateString('pt-AO')) : new Date().toLocaleDateString('pt-AO')) : undefined
    });

    // Reset Form
    setEditingStudentId(null);
    setNewId('');
    setNewName('');
    setNewGender('');
    setNewSpecialty('');
    setNewFatherName('');
    setNewMotherName('');
    setNewBi('');
    setNewBiSector('');
    setNewBiDate('');
    setNewDocType('BI');
    setNewCedulaRegisto('');
    setNewCedulaFls('');
    setNewCedulaLivro('');
    setNewCedulaAno('');
    setNewContact('');
    setNewPeriod('');
    setNewBirthDate('');
    setNewProvince('');
    setNewNaturalidade('');
    setIsTransferidoEntrada(false);
    setIsTransferidoSaida(false);
    setCurrentFormStep(1);
    setFormError('');
    setIsAdding(false);
  };

  const autofillId = () => {
    if (editingStudentId) return;
    if (!newName.trim()) {
      setNewId('');
      return;
    }
    const candidateId = generateStudentId(newName, newClass, newSection, students.map(s => s.id));
    setNewId(candidateId);
  };

  return (
    <div id="student-directory-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs">
        <div>
          <h2 className="text-xl font-heading font-semibold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            Cadastro de Base de Dados (Alunos)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gere o registo oficial de alunos. Use os filtros para selecionar turmas específicas.
          </p>
        </div>
        
        {userRole === 'PROFESSOR' ? (
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl shadow-3xs">
            <span>🔒 Apenas Leitura (Professor)</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isConfirmingClearAll ? (
              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1.5 rounded-xl animate-pulse">
                <span className="text-[10px] font-bold text-rose-700 px-1">Tem a certeza?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onClearAllStudents) onClearAllStudents();
                    setIsConfirmingClearAll(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-755 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Sim, Limpar Tudo!
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingClearAll(false)}
                  className="bg-slate-250 hover:bg-slate-300 text-slate-705 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Não
                </button>
              </div>
            ) : (
              onClearAllStudents && students.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingClearAll(true)}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3.5 py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                  title="Apagar todos os alunos e pautas da base de dados"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Limpar Base de Dados</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setIsTransferManagerOpen(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-xs shrink-0"
              title="Marcar aluno como transferido para fora (saída)"
            >
              <RefreshCw className="w-4 h-4" />
              Transferir Aluno (Saída)
            </button>

            <button
              id="btn-toggle-add-student"
              type="button"
              onClick={() => {
                if (isAdding) {
                  setIsAdding(false);
                  setEditingStudentId(null);
                  setNewId('');
                  setNewName('');
                  setNewGender('');
                  setNewSpecialty('');
                  setNewFatherName('');
                  setNewMotherName('');
                  setNewBi('');
                  setNewBiSector('');
                  setNewBiDate('');
                  setNewDocType('BI');
                  setNewCedulaRegisto('');
                  setNewCedulaFls('');
                  setNewCedulaLivro('');
                  setNewCedulaAno('');
                  setNewContact('');
                  setNewPeriod('');
                  setNewBirthDate('');
                  setNewProvince('');
                  setNewNaturalidade('');
                  setCurrentFormStep(1);
                  setFormError('');
                } else {
                  setIsAdding(true);
                  setEditingStudentId(null);
                  setNewName('');
                  setNewId('');
                  setNewSpecialty('');
                  setNewClass('');
                  setNewSection('');
                  setNewPeriod('');
                }
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white font-medium px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              {isAdding ? (editingStudentId ? 'Fechar Edição' : 'Fechar Formulário') : 'Adicionar Novo Aluno'}
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <form
          id="add-student-form"
          onSubmit={handleSubmit}
          className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-fadeIn"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-base font-heading font-semibold text-slate-800">
              Formulário de Registo de Aluno
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-150 px-2.5 py-1 rounded-full font-semibold">
              Secção {currentFormStep} de 3
            </span>
          </div>

          {/* Wizard Step Progress Indicator */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            {[
              { step: 1, label: '1. Identificação Geral', icon: FileText },
              { step: 2, label: '2. Filiação Directa', icon: User },
              { step: 3, label: '3. Geografia & Contacto', icon: MapPin },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = currentFormStep === item.step;
              const isCompleted = currentFormStep > item.step;
              return (
                <div key={item.step} className="flex items-center gap-2 w-full sm:flex-1 justify-between sm:justify-start">
                  <div className={`flex items-center gap-2 pb-1.5 transition-all duration-300 ${isActive ? 'text-indigo-600 font-bold' : isCompleted ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${isActive ? 'bg-indigo-600 text-white shadow-xs' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {isCompleted ? '✓' : item.step}
                    </div>
                    <span className="text-xs">{item.label}</span>
                  </div>
                  {item.step < 3 && <div className={`h-0.5 flex-1 mx-4 hidden sm:block ${isCompleted ? 'bg-emerald-500' : 'bg-slate-150'}`}></div>}
                </div>
              );
            })}
          </div>
          
          {formError && (
            <div className="bg-rose-50 border border-rose-250 text-rose-700 text-xs px-4 py-3 rounded-lg font-semibold flex items-center gap-1.5 animate-pulse">
              <span>⚠</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Group 1: Academic & Identification */}
          {currentFormStep === 1 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileText className="w-3.5 h-3.5" />
                1. Identificação Geral & Dados Académicos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Membro ID (Matrícula)</label>
                  <input
                    type="text"
                    value={newId || "Pendente (digite o nome completo)..."}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-mono font-extrabold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Nome Completo do Aluno</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => setNewName(formatarNomeProprio(newName))}
                    autoCapitalize="words"
                    placeholder="Ex: Manuel Francisco Domingos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Género / Sexo</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  >
                    <option value="">-- Escolha o Género --</option>
                    <option value="M">Masculino (M)</option>
                    <option value="F">Feminino (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Classe</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">-- Escolha a Classe --</option>
                    {classes.map(cl => (
                      <option key={cl} value={cl}>{cl}ª</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Turma</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">-- Escolha a Turma --</option>
                    {sections.map(sec => (
                      <option key={sec} value={sec}>Turma {sec}</option>
                    ))}
                  </select>
                </div>

                {(isPUNIV || isMagisterio) && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                      <span className="text-indigo-600 font-bold">Especialidade</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value as any)}
                      className="w-full bg-slate-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="">-- Escolha a Especialidade --</option>
                      {isMagisterio ? (
                        <>
                          <option value="MF">Matemática e Física (Mat-Fisica)</option>
                          <option value="GH">História e Geografia (Geo-Historia)</option>
                          <option value="BQ">Biologia e Química (Bio-química)</option>
                          <option value="LEMC">Português e EMC</option>
                          <option value="ING_EMC">Inglês e EMC</option>
                          <option value="FRA_EMC">Francês e EMC</option>
                          <option value="EVP">Educação Visual e Plástica (EVP)</option>
                          <option value="EDF">Educação Física (Ed.F)</option>
                          <option value="EMC">Educação Moral e Cívica (EMC)</option>
                          <option value="EP">Ensino Primário</option>
                          <option value="PE">Pré-Escolar</option>
                        </>
                      ) : (
                        <>
                          <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                          <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                          <option value="CS">Ciências Sociais (CS)</option>
                          <option value="AV">Artes Visuais (AV)</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {showLangSelectorInDirectory(newClass) && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                      <span className="text-indigo-600 font-bold">Língua Estrangeira</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={newForeignLanguage}
                      onChange={(e) => setNewForeignLanguage(e.target.value as 'INGLÊS' | 'FRANCÊS')}
                      className="w-full bg-slate-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="INGLÊS">Língua Inglesa (Inglês)</option>
                      <option value="FRANCÊS">Língua Francesa (Francês)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1 flex items-center gap-1">
                    <span>Período Letivo</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">-- Escolha o Período --</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>

                {/* Opções de Transferência */}
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-3.5">
                    <input
                      type="checkbox"
                      id="chk-is-transferido-entrada"
                      checked={isTransferidoEntrada}
                      onChange={(e) => setIsTransferidoEntrada(e.target.checked)}
                      className="w-4.5 h-4.5 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="chk-is-transferido-entrada" className="text-xs font-black text-indigo-950 block cursor-pointer select-none">Este aluno veio Transferido (Entrada)?</label>
                      <span className="text-[10px] text-indigo-600 block leading-normal font-medium select-none">Assinale esta opção caso o aluno tenha sido admitido vindo de outra escola.</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center gap-3.5">
                    <input
                      type="checkbox"
                      id="chk-is-transferido-saida"
                      checked={isTransferidoSaida}
                      onChange={(e) => setIsTransferidoSaida(e.target.checked)}
                      className="w-4.5 h-4.5 text-rose-600 border-rose-300 rounded focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="chk-is-transferido-saida" className="text-xs font-black text-rose-950 block cursor-pointer select-none">Este aluno foi Transferido (Saída)?</label>
                      <span className="text-[10px] text-rose-600 block leading-normal font-medium select-none">Assinale esta opção caso o aluno tenha sido transferido para fora desta escola.</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-slate-100 pt-3 mt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <span>Documento de Identificação</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="newDocType"
                        value="BI"
                        checked={newDocType === 'BI'}
                        onChange={() => setNewDocType('BI')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Bilhete de Identidade (B.I.)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="newDocType"
                        value="CEDULA"
                        checked={newDocType === 'CEDULA'}
                        onChange={() => setNewDocType('CEDULA')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Cédula Pessoal</span>
                    </label>
                  </div>
                </div>

                {newDocType === 'BI' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>Nº B.I. (Identidade)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={newBi}
                        onChange={(e) => setNewBi(e.target.value.toUpperCase())}
                        maxLength={14}
                        placeholder="Ex: 005580255LN078"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>Sector de Emissão B.I.</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <BiSectorSelect
                        value={newBiSector}
                        onChange={setNewBiSector}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>Data Emissão B.I.</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="date"
                        value={newBiDate}
                        onChange={(e) => setNewBiDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>Nº de Registo (Cédula)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCedulaRegisto}
                        onChange={(e) => setNewCedulaRegisto(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={12}
                        placeholder="Ex: 123456789012"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>a fls (Nº da folha)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCedulaFls}
                        onChange={(e) => setNewCedulaFls(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={10}
                        placeholder="Ex: 123456"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>Livro nº</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCedulaLivro}
                        onChange={(e) => setNewCedulaLivro(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={5}
                        placeholder="Ex: 123"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                        <span>Ano de Emissão</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCedulaAno}
                        onChange={(e) => setNewCedulaAno(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={4}
                        placeholder="Ex: 2026"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Group 2: Filiação */}
          {currentFormStep === 2 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <User className="w-3.5 h-3.5" />
                2. Filiação (Parentes Diretos)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Nome Completo do Pai</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFatherName}
                    onChange={(e) => setNewFatherName(e.target.value)}
                    onBlur={() => setNewFatherName(formatarNomeProprio(newFatherName))}
                    autoCapitalize="words"
                    placeholder="Nome do pai do aluno"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Nome Completo da Mãe</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMotherName}
                    onChange={(e) => setNewMotherName(e.target.value)}
                    onBlur={() => setNewMotherName(formatarNomeProprio(newMotherName))}
                    autoCapitalize="words"
                    placeholder="Nome da mãe do aluno"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Group 3: Contacto, Nascimento & Localidade */}
          {currentFormStep === 3 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <MapPin className="w-3.5 h-3.5" />
                3. Origem (Geografia de Angola), Contacto & Idade
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Contacto Telefónico</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    <input
                      type="text"
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      placeholder="9XXXXXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Data de Nascimento</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 z-10" />
                    <input
                      type="date"
                      value={newBirthDate}
                      onChange={(e) => setNewBirthDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1">Idade Calculada</label>
                  <div className="bg-slate-100 border border-slate-200 text-slate-650 text-xs px-3 py-2 rounded-lg font-mono font-bold">
                    {newBirthDate ? `${calculateAge(newBirthDate)} anos` : 'Selecione data'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Província de Angola</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={newProvince}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                    required
                  >
                    <option value="">-- Selecione a Província --</option>
                    {Object.keys(LOCALIDADES_ANGOLA).map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1 flex items-center gap-1">
                    <span>Naturalidade (Município)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={newNaturalidade}
                    onChange={(e) => setNewNaturalidade(e.target.value)}
                    disabled={!newProvince}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150"
                    required
                  >
                    <option value="">-- Selecione o Município --</option>
                    {(LOCALIDADES_ANGOLA[newProvince] || []).map((muni) => (
                      <option key={muni} value={muni}>{muni}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200/50">
            <div>
              {isConfirmingClearForm ? (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 p-1 rounded-lg">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase px-1.5">Limpar formulário?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('');
                      setNewGender('');
                      setNewSpecialty('');
                      setNewFatherName('');
                      setNewMotherName('');
                      setNewBi('');
                      setNewBiSector('');
                      setNewBiDate('');
                      setNewDocType('BI');
                      setNewCedulaRegisto('');
                      setNewCedulaFls('');
                      setNewCedulaLivro('');
                      setNewCedulaAno('');
                      setNewContact('');
                      setNewPeriod('');
                      setNewBirthDate('');
                      setNewProvince('');
                      setNewNaturalidade('');
                      setIsTransferidoEntrada(false);
                      setIsTransferidoSaida(false);
                      setCurrentFormStep(1);
                      setFormError('');
                      setIsConfirmingClearForm(false);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors uppercase cursor-pointer"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClearForm(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold text-[10px] px-2 py-1 rounded transition-colors uppercase cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingClearForm(true)}
                  className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Limpar Formulário
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingStudentId(null);
                  setCurrentFormStep(1);
                  setFormError('');
                  setNewId('');
                  setNewName('');
                  setNewGender('');
                  setNewSpecialty('');
                  setNewFatherName('');
                  setNewMotherName('');
                  setNewBi('');
                  setNewBiSector('');
                  setNewBiDate('');
                  setNewDocType('BI');
                  setNewCedulaRegisto('');
                  setNewCedulaFls('');
                  setNewCedulaLivro('');
                  setNewCedulaAno('');
                  setNewContact('');
                  setNewPeriod('');
                  setNewBirthDate('');
                  setNewProvince('');
                  setNewNaturalidade('');
                  setIsTransferidoEntrada(false);
                  setIsTransferidoSaida(false);
                  setIsConfirmingClearForm(false);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              {currentFormStep > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentFormStep((prev) => prev - 1);
                    setFormError('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  ← Anterior
                </button>
              )}

              {currentFormStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentFormStep === 1) {
                      if (!newName.trim()) {
                        setFormError('Por favor, preencha o Nome Completo do Aluno.');
                        return;
                      }
                      if (!newGender) {
                        setFormError('Por favor, selecione o Género / Sexo do Aluno (campo obrigatório).');
                        return;
                      }
                      if (!newClass) {
                        setFormError('Por favor, selecione a Classe (campo obrigatório).');
                        return;
                      }
                      if (!newSection) {
                        setFormError('Por favor, selecione a Turma (campo obrigatório).');
                        return;
                      }
                      if ((isPUNIV || isMagisterio) && !newSpecialty) {
                        setFormError('Por favor, selecione a Especialidade / Curso (campo obrigatório).');
                        return;
                      }
                      if (!newPeriod) {
                        setFormError('Por favor, selecione o Período Letivo (campo obrigatório).');
                        return;
                      }
                      if (!newBi.trim()) {
                        setFormError('Por favor, preencha o número do B.I. (campo obrigatório).');
                        return;
                      }
                      const biReg = /^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/;
                      if (!biReg.test(newBi.trim())) {
                        setFormError('O B.I. deve ter exatamente 14 caracteres no formato oficial de Angola (9 números, 2 letras, 3 números - Ex: 005580255LN078).');
                        return;
                      }
                      if (!newBiSector.trim()) {
                        setFormError('Por favor, preencha o Sector de Emissão do B.I. (campo obrigatório).');
                        return;
                      }
                      if (!newBiDate) {
                        setFormError('Por favor, selecione a Data de Emissão do B.I. (campo obrigatório).');
                        return;
                      }
                    } else if (currentFormStep === 2) {
                      if (!newFatherName.trim()) {
                        setFormError('Por favor, preencha o Nome Completo do Pai.');
                        return;
                      }
                      if (!newMotherName.trim()) {
                        setFormError('Por favor, preencha o Nome Completo da Mãe.');
                        return;
                      }
                    }
                    setFormError('');
                    setCurrentFormStep((prev) => prev + 1);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Seguinte →
                </button>
              ) : (
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Gravar Registo (VBA Base_Dados)
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Advanced filters and search */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por ID ou Nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700"
          />
        </div>

      {(() => {
        const matched = searchTerm.trim() ? students.find(s => s.id.trim().toUpperCase() === searchTerm.trim().toUpperCase()) : null;
        if (!matched) return null;
        return (
          <div className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeIn text-xs text-indigo-900 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider">{matched.id}</span>
              <div>
                <p className="font-bold text-slate-800 text-sm">ID de Aluno Encontrado!</p>
                <p className="text-slate-500 font-medium">Nome: <strong className="text-indigo-900">{matched.name}</strong> ({matched.class}ª - Turma {matched.section})</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                startEditingStudent(matched);
                setSearchTerm(''); // Clear search
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar Dados do Aluno
            </button>
          </div>
        );
      })()}

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros Rápidos:</span>
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">
              {loggedInStaff && loggedInStaff.role === 'PROFESSOR' ? 'Todas Minhas Classes' : 'Todas as Classes'}
            </option>
            {(loggedInStaff && loggedInStaff.role === 'PROFESSOR' ? getProfessorAllowedClasses(loggedInStaff, classes) : classes).map(cl => (
              <option key={cl} value={cl}>{cl}ª</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">
              {loggedInStaff && loggedInStaff.role === 'PROFESSOR' ? 'Todas Minhas Turmas' : 'Todas as Turmas'}
            </option>
            {(loggedInStaff && loggedInStaff.role === 'PROFESSOR' ? getProfessorAllowedSections(loggedInStaff, selectedClass === 'All' ? '' : selectedClass, sections) : sections).map(sec => (
              <option key={sec} value={sec}>Turma {sec}</option>
            ))}
          </select>

          <select
            value={filterTransferidos}
            onChange={(e) => setFilterTransferidos(e.target.value as any)}
            className="text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-indigo-900 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ATIVOS">Estado: Apenas Alunos Ativos</option>
            <option value="TRANSFERIDOS_SAIDA">Estado: Alunos Transferidos (Saída)</option>
            <option value="TODOS">Estado: Todos (Histórico Geral)</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium uppercase tracking-wider">
                <th className="py-3.5 px-3 w-10"></th>
                <th className="py-3.5 px-4 w-28">ID Aluno</th>
                <th className="py-3.5 px-6">Nome Completo</th>
                <th className="py-3.5 px-6">Gênero</th>
                <th className="py-3.5 px-6">Classe</th>
                <th className="py-3.5 px-6">Turma & Período</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const isExpanded = expandedStudentId === student.id;
                  return (
                    <React.Fragment key={student.id}>
                      <tr 
                        onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                        className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/10' : ''}`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 mx-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-500">{student.id}</td>
                        <td className="py-3.5 px-6 font-medium text-slate-800">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900">{student.name}</span>
                              {student.isTransferidoEntrada && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" title="Aluno veio transferido de outra instituição">Vindo de Transferência</span>
                              )}
                              {student.isTransferidoSaida && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" title="Aluno transferido para fora da instituição">Transferido para Fora (Saída)</span>
                              )}
                            </div>
                            {student.bi && <span className="text-[10px] text-slate-400 font-mono mt-0.5">BI: {student.bi}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            student.gender === 'F' 
                              ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {student.gender === 'M' ? 'Masculino (M)' : 'Feminino (F)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-heading font-medium">{student.class}ª</td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col text-xs font-medium text-slate-600">
                            <span>Turma {student.section}</span>
                            <span className="text-[10px] text-slate-400 font-sans italic">{student.periodo || 'Manhã'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2 items-center">
                            <button
                              onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                              className="px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg hover:text-indigo-750 transition-colors inline-flex items-center gap-1 font-semibold"
                            >
                              Ver Ficha
                            </button>
                            {userRole !== 'PROFESSOR' && (
                              <button
                                onClick={() => startEditingStudent(student)}
                                className="px-2.5 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg hover:text-amber-700 transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                                title="Editar dados do aluno"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            )}
                            {userRole === 'PROFESSOR' ? (
                              <span className="text-[10px] text-slate-450 font-semibold italic">🔒 Bloqueado</span>
                            ) : confirmDeleteId === student.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-1 rounded-lg">
                                <span className="text-[10px] font-extrabold text-rose-700 uppercase px-1">Eliminar?</span>
                                <button
                                  onClick={() => {
                                    onDeleteStudent(student.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors uppercase cursor-pointer"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold text-[10px] px-2 py-1 rounded transition-colors uppercase cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(student.id)}
                                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg hover:text-rose-700 transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                                title="Eliminar Aluno"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remover
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Detailed registration profile card */}
                      {isExpanded && (
                        <tr className="bg-indigo-50/15 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          <td colSpan={7} className="px-6 py-4 border-t border-b border-indigo-100/40">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-slate-600 bg-white p-5 rounded-2xl border border-indigo-100/50 shadow-sm">
                              <div className="space-y-2 border-r border-slate-100 pr-4">
                                <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5" />
                                  1. Filiação (Parentes)
                                </p>
                                <p className="text-slate-700"><strong>Pai:</strong> {student.fatherName || <span className="text-slate-350 italic">Não registado</span>}</p>
                                <p className="text-slate-700"><strong>Mãe:</strong> {student.motherName || <span className="text-slate-350 italic">Não registada</span>}</p>
                              </div>
                              
                              <div className="space-y-2 border-r border-slate-100 pr-4">
                                <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" />
                                  2. Identidade & Contacto
                                </p>
                                <p className="text-slate-700"><strong>B.I. Identidade:</strong> <span className="font-mono">{student.bi || <span className="text-slate-350 italic">Não registado</span>}</span></p>
                                <p className="text-slate-700"><strong>Sector Emissão:</strong> <span>{student.biSector || <span className="text-slate-350 italic">Não registado</span>}</span></p>
                                <p className="text-slate-700"><strong>Data Emissão B.I.:</strong> <span>{(() => {
                                  if (!student.biDate) return <span className="text-slate-350 italic">Não registada</span>;
                                  try {
                                    const d = new Date(student.biDate + 'T00:00:00');
                                    if (isNaN(d.getTime())) return <span className="font-mono text-slate-700">{student.biDate}</span>;
                                    return <span className="font-mono text-slate-700">{d.toLocaleDateString('pt-AO')}</span>;
                                  } catch {
                                    return <span className="font-mono text-slate-700">{student.biDate}</span>;
                                  }
                                })()}</span></p>
                                <p className="text-slate-700"><strong>Contacto:</strong> <span className="font-mono">{student.contact || <span className="text-slate-350 italic">Não registado</span>}</span></p>
                              </div>

                              <div className="space-y-2 border-r border-slate-100 pr-4">
                                <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  3. Nascimento & Idade
                                </p>
                                <p className="text-slate-700"><strong>Data de Nasc.:</strong> {(() => {
                                  if (!student.birthDate) return <span className="text-slate-350 italic">Não registada</span>;
                                  try {
                                    const d = new Date(student.birthDate + 'T00:00:00');
                                    if (isNaN(d.getTime())) return <span className="text-slate-700">{student.birthDate}</span>;
                                    return d.toLocaleDateString('pt-AO');
                                  } catch {
                                    return <span className="text-slate-700">{student.birthDate}</span>;
                                  }
                                })()}</p>
                                <p className="text-slate-700"><strong>Idade Calculada:</strong> {(() => {
                                  if (typeof student.age === 'number' && !isNaN(student.age) && student.age > 0) return `${student.age} anos`;
                                  if (!student.birthDate) return <span className="text-slate-350 italic">Não calculada</span>;
                                  const parts = student.birthDate.trim().split('T')[0].split('-');
                                  if (parts.length !== 3) return <span className="text-slate-350 italic">Não calculada</span>;
                                  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                  if (isNaN(d.getTime())) return <span className="text-slate-350 italic">Não calculada</span>;
                                  const today = new Date();
                                  let calculatedAge = today.getFullYear() - d.getFullYear();
                                  const m = today.getMonth() - d.getMonth();
                                  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) calculatedAge--;
                                  return calculatedAge >= 0 && calculatedAge < 120 ? `${calculatedAge} anos` : <span className="text-slate-350 italic">Não calculada</span>;
                                })()}</p>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  4. Localidade de Origem
                                </p>
                                <p className="text-slate-700"><strong>Província (Angola):</strong> {student.province || <span className="text-slate-350 italic">Não registada</span>}</p>
                                <p className="text-slate-700"><strong>Naturalidade / Muni.:</strong> {student.naturalidade || <span className="text-slate-350 italic">Não registada</span>}</p>
                                <p className="text-slate-700 flex items-center gap-1.5">
                                  <strong>Período Letivo:</strong>
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/60 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    {student.periodo || 'Manhã'}
                                  </span>
                                </p>
                                {showLangSelectorInDirectory(student.class) && (
                                  <p className="text-slate-700 flex items-center gap-1.5 mt-1">
                                    <strong>Língua Estrangeira:</strong>
                                    <span className="bg-emerald-55 bg-emerald-50 text-emerald-800 border border-emerald-150 px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                                      {student.foreignLanguage || 'INGLÊS'}
                                    </span>
                                  </p>
                                )}
                                 {(isPUNIV || isMagisterio) && (
                                  <p className="text-slate-700 flex items-center gap-1.5 mt-1">
                                    <strong>Especialidade:</strong>
                                    <span className="bg-indigo-50 text-indigo-800 border border-indigo-150 px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                                      {(() => {
                                        const spec = student.specialty || (
                                          isMagisterio 
                                            ? (student.section.toUpperCase().startsWith('EP') ? 'EP' : student.section.toUpperCase().startsWith('EI') ? 'EI' : 'PE')
                                            : (student.section.toUpperCase().startsWith('CB') || student.section.toUpperCase().startsWith('FM') ? 'CFB' : student.section.toUpperCase().startsWith('CSE') ? 'CEJ' : student.section.toUpperCase().startsWith('LA') ? 'AV' : 'CFB')
                                        );
                                        switch (spec) {
                                          case 'CFB': return 'Ciências Físicas e Biológicas (CFB)';
                                          case 'CEJ': return 'Ciências Económico-Jurídicas (CEJ)';
                                          case 'CS': return 'Ciências Sociais (CS)';
                                          case 'AV': return 'Artes Visuais (AV)';
                                          case 'EP': return 'Ensino Primário (EP)';
                                          case 'EI': return 'Educação de Infância (EI)';
                                          case 'PE': return 'Pré-Escolar (PE)';
                                          default: return spec;
                                        }
                                      })()}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    Nenhum aluno cadastrado coincide com a pesquisa ou filtros ativos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="bg-slate-50/40 px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>Mostrando {filteredStudents.length} de {students.length} alunos cadastrados</span>
          <span className="font-mono">SIGEP DB v1.0</span>
        </div>
      </div>

      {/* MODAL DE GESTÃO DE TRANSFERÊNCIAS (SAÍDA) */}
      {isTransferManagerOpen && (
        <div className="fixed inset-0 bg-slate-955/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-750 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <div>
                  <h3 className="font-heading font-black text-xs uppercase tracking-wider">Gestão de Alunos Transferidos (Saída de Alunos)</h3>
                  <p className="text-[10px] text-rose-100 font-medium">Comunique ao sistema quais alunos foram transferidos e já não fazem parte da instituição.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsTransferManagerOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              
              {/* Filtros da Grelha */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Filtrar por Classe</label>
                  <select
                    value={transferFilterClass}
                    onChange={(e) => setTransferFilterClass(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="All">Todas as Classes</option>
                    {classes.map(cl => (
                      <option key={cl} value={cl}>{cl}ª</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Filtrar por Turma</label>
                  <select
                    value={transferFilterSection}
                    onChange={(e) => setTransferFilterSection(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="All">Todas as Turmas</option>
                    {sections.map(sec => (
                      <option key={sec} value={sec}>Turma {sec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Pesquisar por Nome ou ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      value={transferSearch}
                      onChange={(e) => setTransferSearch(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-700 focus:outline-none focus:border-rose-500 font-medium"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Grelha de Alunos */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-2xs max-h-[40vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-2.5 px-4 w-28">ID Aluno</th>
                      <th className="py-2.5 px-4">Nome do Aluno</th>
                      <th className="py-2.5 px-4">Classe/Turma</th>
                      <th className="py-2.5 px-4">Estado Atual</th>
                      <th className="py-2.5 px-4 text-right">Ação de Transferência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium animate-fadeIn">
                    {(() => {
                      const list = students.filter(s => {
                        const matchesClass = transferFilterClass === 'All' || s.class === transferFilterClass;
                        const matchesSection = transferFilterSection === 'All' || s.section === transferFilterSection;
                        const matchesSearch = s.name.toLowerCase().includes(transferSearch.toLowerCase()) || s.id.toUpperCase().includes(transferSearch.toUpperCase());
                        return matchesClass && matchesSection && matchesSearch;
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                              Nenhum aluno encontrado correspondente aos critérios de busca.
                            </td>
                          </tr>
                        );
                      }

                      return list.map(student => {
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{student.id}</td>
                            <td className="py-2.5 px-4 text-slate-900 font-bold">{student.name}</td>
                            <td className="py-2.5 px-4">{student.class}ª - Turma {student.section}</td>
                            <td className="py-2.5 px-4">
                              {student.isTransferidoSaida ? (
                                <span className="inline-flex bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Transferido (Inativo)</span>
                              ) : (
                                <span className="inline-flex bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Ativo</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {student.isTransferidoSaida ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAddStudent({
                                      ...student,
                                      isTransferidoSaida: false,
                                      dataTransferenciaSaida: undefined
                                    });
                                    setConfirmTransferId(null);
                                  }}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all uppercase tracking-wide"
                                >
                                  Reintegrar Aluno
                                </button>
                              ) : confirmTransferId === student.id ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-pulse">
                                  <span className="text-[9px] font-black text-rose-700 px-1 uppercase tracking-tighter">Confirmar Transferência?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onAddStudent({
                                        ...student,
                                        isTransferidoSaida: true,
                                        guiaTransferenciaSaida: student.guiaTransferenciaSaida || `GS-${new Date().getFullYear()}-${90412 + students.filter(s => s.isTransferidoSaida).length}`,
                                        dataTransferenciaSaida: new Date().toLocaleDateString('pt-AO')
                                      });
                                      setConfirmTransferId(null);
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] px-2 py-1 rounded cursor-pointer uppercase transition-colors"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmTransferId(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] px-2 py-1 rounded cursor-pointer uppercase transition-colors"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmTransferId(student.id)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all uppercase tracking-wide"
                                >
                                  Transferir Aluno
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Informação Estatística de Apoio */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Como funciona o fluxo de saída?</h4>
                <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
                  Ao marcar um aluno como <strong>Transferido (Saída)</strong>, o sistema define o seu estado como inativo para as turmas e pautas oficiais. Contudo, os seus dados cadastrais são preservados no banco de dados para garantir relatórios estatísticos de início de matrículas, trimestrais e anuais geridos pela própria instituição de acordo com as diretrizes curriculares.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTransferManagerOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition-all shadow-xs"
              >
                Concluir & Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

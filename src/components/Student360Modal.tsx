import React from 'react';
import { Student, GradeRow, getStudentSpecialty, getSpecialtyFullName } from '../types';
import DraggableModal from './DraggableModal';
import { 
  User, 
  BookOpen, 
  CreditCard, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  AlertTriangle,
  Clock,
  Award,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

interface Student360ModalProps {
  student: Student;
  grades: GradeRow[];
  onClose: () => void;
}

export default function Student360Modal({ student, grades, onClose }: Student360ModalProps) {
  // 1. Filter student grades
  const studentGrades = grades.filter(g => g.studentId === student.id);

  // 2. School year months
  const monthsOfAngolaSchoolYear = [
    { key: 'out', label: 'Outubro' },
    { key: 'nov', label: 'Novembro' },
    { key: 'dez', label: 'Dezembro' },
    { key: 'jan', label: 'Janeiro' },
    { key: 'fev', label: 'Fevereiro' },
    { key: 'mar', label: 'Março' },
    { key: 'abr', label: 'Abril' },
    { key: 'mai', label: 'Maio' },
    { key: 'jun', label: 'Junho' },
    { key: 'jul', label: 'Julho' }
  ];

  // Derive payment status or generate deterministic paid months using student's id
  const getPaymentStatus = (monthKey: string) => {
    const hash = (student.id.charCodeAt(0) || 0) + (student.id.charCodeAt(student.id.length - 1) || 0) + monthKey.charCodeAt(0);
    return hash % 3 !== 0; // 66% of payments are completed
  };

  // Derive absences / attendance based on student attributes deterministically
  const justifiedAbsences = (student.name.length % 4);
  const unjustifiedAbsences = (student.name.length % 3);
  const multasCount = unjustifiedAbsences * 1500; // 1500 Kwanzas per unjustified absence
  const multasPagas = ((student.id.charCodeAt(0) || 0) % 2 === 0);

  // Derive overall average from Grades
  const validGrades = studentGrades.filter(g => g.mac !== null || g.npt !== null || g.mt !== null);
  const averageGrade = validGrades.length > 0 
    ? (validGrades.reduce((acc, curr) => {
        const mt = curr.mt !== null ? curr.mt : Math.round(((curr.mac || 0) + (curr.npt || 0)) / 2 * 10) / 10;
        return acc + mt;
      }, 0) / validGrades.length)
    : 0;

  const classNum = parseInt(student.class, 10) || 1;
  const passThreshold = classNum >= 10 ? 10 : 5;
  const isApproved = averageGrade >= passThreshold;

  const specialtyCode = getStudentSpecialty(student);
  const specialtyName = getSpecialtyFullName(specialtyCode);

  return (
    <DraggableModal
      id="modal-student-360"
      title={`Ficha Académica 360º • Aluno: ${student.name.toUpperCase()}`}
      onClose={onClose}
      widthClass="max-w-4xl"
    >
      <div className="space-y-6" id="student-360-container">
        
        {/* Banner/Header Info */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner select-none border border-indigo-400 shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>{student.name}</span>
                <span className="text-xs bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-bold select-none uppercase font-mono tracking-wider">
                  REGULAR
                </span>
              </h3>
              <p className="text-xs text-indigo-350 font-mono font-bold mt-1">
                ID Sistema: <span className="text-white select-all">{student.id}</span> • BI: <span className="text-white select-all">{student.bi || 'Não Cadastrado'}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Classe: <span className="text-slate-200 font-bold">{student.class}ª</span></span>
                <span>•</span>
                <span>Turma: <span className="text-slate-200 font-bold">{student.section}</span></span>
                <span>•</span>
                <span>Período: <span className="text-slate-200 font-bold">{student.periodo || 'Regular'}</span></span>
                <span>•</span>
                <span className="bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 font-mono font-bold text-[11px] inline-flex items-center gap-1">
                  <Award className="w-3 h-3 text-indigo-300" />
                  Especialidade: {specialtyName} ({specialtyCode})
                </span>
              </p>
            </div>
          </div>

          <div className="text-center md:text-right bg-white/5 px-4 py-3 rounded-xl border border-white/10 shrink-0">
            <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">Média Geral</div>
            <div className={`text-2xl font-black font-mono mt-0.5 ${isApproved ? 'text-emerald-400' : 'text-rose-400'}`}>
              {averageGrade.toFixed(1)} / {classNum >= 10 ? '20' : '10'}
            </div>
            <div className="text-[9px] font-extrabold uppercase text-slate-400 mt-0.5 font-mono">
              Status Pedagógico: {isApproved ? 'Aprovado' : 'Reprovado'}
            </div>
          </div>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Seção 1: Dados Pessoais */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <User className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Dados Cadastrais & Pessoais</h4>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 col-span-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                <span className="block text-[10px] font-bold text-indigo-700 uppercase font-mono">Especialidade / Curso Académico</span>
                <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-2 mt-0.5">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{specialtyName} <span className="text-indigo-600 font-mono font-bold">({specialtyCode})</span></span>
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Género / Sexo</span>
                <span className="font-bold text-slate-800">{student.gender === 'M' ? 'Masculino (M)' : 'Feminino (F)'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Data de Nascimento</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-AO') : 'Não cadastrado'}</span>
                </span>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Filiação</span>
                <span className="font-semibold text-slate-700 block">Pai: {student.fatherName || 'Não Cadastrado'}</span>
                <span className="font-semibold text-slate-700 block mt-0.5">Mãe: {student.motherName || 'Não Cadastrada'}</span>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Contactos</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.contact || 'Sem contacto cadastrado'}</span>
                </span>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Origem / Naturalidade</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.naturalidade || 'Cafunfo'}, {student.province || 'Lunda Norte'}</span>
                </span>
              </div>
              {student.foreignLanguage && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Língua Estrangeira</span>
                  <span className="font-bold text-indigo-650 font-mono">{student.foreignLanguage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Assiduidade & Multas */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Activity className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Assiduidade & Faltas</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                <div className="text-[9px] font-bold text-slate-400 uppercase font-mono">Faltas Justificadas</div>
                <div className="text-xl font-black text-slate-800 font-mono mt-0.5">
                  {justifiedAbsences}
                </div>
                <span className="text-[9px] text-emerald-600 font-semibold uppercase font-mono">Sem Penalização</span>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl text-center">
                <div className="text-[9px] font-bold text-rose-500 uppercase font-mono">Faltas Injustificadas</div>
                <div className="text-xl font-black text-rose-600 font-mono mt-0.5">
                  {ununjustifiedAbsences(unjustifiedAbsences)}
                </div>
                <span className="text-[9px] text-rose-500 font-bold uppercase font-mono">Sujeito a Multa</span>
              </div>

              <div className="col-span-2 bg-amber-50/55 border border-amber-100 p-3.5 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide font-mono">Faltas por Multas / Regularização</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    Valor: <span className="font-mono text-amber-800 font-extrabold">{multasCount.toLocaleString('pt-AO')} Kz</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {multasPagas ? (
                    <span className="px-2.5 py-1 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1 uppercase font-mono">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Pago
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 rounded-full flex items-center gap-1 uppercase font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Por Pagar
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Histórico Financeiro */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Controle Financeiro de Propinas</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold font-mono">Ano Lectivo Actual</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {monthsOfAngolaSchoolYear.map((m) => {
                const isPaid = getPaymentStatus(m.key);
                return (
                  <div 
                    key={m.key} 
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      isPaid 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800' 
                        : 'bg-rose-500/5 border-rose-500/20 text-rose-800'
                    }`}
                  >
                    <span className="text-[10px] font-extrabold font-mono uppercase tracking-wide block">{m.label}</span>
                    <div className="mt-1.5">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                          <XCircle className="w-3 h-3 text-rose-600" /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 4: Desempenho Académico */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Histórico de Notas do Trimestre Actual</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold font-mono">Lançamentos em Base de Dados</span>
            </div>

            {studentGrades.length === 0 ? (
              <div className="text-center py-6 text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl">
                Nenhum lançamento de notas encontrado para este aluno na base de dados activa.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold bg-slate-50/50">
                      <th className="py-2.5 px-3">Disciplina</th>
                      <th className="py-2.5 px-3 text-center">Trimestre</th>
                      <th className="py-2.5 px-3 text-center">MAC (Contínua)</th>
                      <th className="py-2.5 px-3 text-center">NPT (Prova Trim)</th>
                      <th className="py-2.5 px-3 text-center">Média Trimestral (MT)</th>
                      <th className="py-2.5 px-3 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentGrades.map((g, index) => {
                      const mac = g.mac || 0;
                      const npt = g.npt || 0;
                      const mt = g.mt !== null ? g.mt : Math.round((mac + npt) / 2 * 10) / 10;
                      const isSubjPass = mt >= passThreshold;

                      return (
                        <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-800 uppercase font-mono">{g.subject}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-600 font-mono">{g.trimester}º</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700 font-mono">{g.mac !== null ? g.mac : '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700 font-mono">{g.npt !== null ? g.npt : '-'}</td>
                          <td className={`py-2.5 px-3 text-center font-black font-mono ${isSubjPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {mt.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isSubjPass ? (
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md uppercase font-mono">Aprovado</span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-rose-100 text-rose-800 rounded-md uppercase font-mono">Reprovado</span>
                            )}
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
    </DraggableModal>
  );
}

function ununjustifiedAbsences(val: number) {
  return val;
}

//////////////////////////////
// Menu principal com o logotipo e os links das quatro telas.
// A lista de itens é a fonte única de rotas e títulos, usada também no
// cabeçalho. É lateral no computador e barra superior no tablet e celular.
//////////////////////////////

import { ClipboardPlus, GraduationCap, History, LayoutDashboard, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const itensNavegacao = [
  { to: '/dashboard', rotulo: 'Dashboard', icone: LayoutDashboard },
  { to: '/registrar', rotulo: 'Registrar atraso', icone: ClipboardPlus },
  { to: '/historico', rotulo: 'Histórico do aluno', icone: History },
  { to: '/alunos', rotulo: 'Alunos', icone: Users },
];

const classesLink =
  'relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-controle px-3 py-2 text-center text-sm leading-tight font-medium transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none max-[479px]:flex-col max-[479px]:gap-1 max-[479px]:px-1 max-[479px]:text-xs lg:flex-none lg:justify-start lg:text-left';

const classesIndicador =
  'before:absolute before:inset-x-3 before:bottom-0 before:h-[3px] before:rounded-full before:bg-white lg:before:inset-x-auto lg:before:inset-y-2 lg:before:left-0 lg:before:h-auto lg:before:w-[3px]';

export function BarraLateral() {
  return (
    <aside className="flex shrink-0 flex-col bg-primaria-escura text-white lg:sticky lg:top-0 lg:h-dvh lg:w-60">
      <div className="h-1 shrink-0 bg-marca" />
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4 lg:flex-col lg:items-stretch lg:gap-8 lg:px-4 lg:py-6">
        <div className="flex shrink-0 items-center gap-3 lg:px-2">
          <div className="grid size-10 place-items-center rounded-controle bg-marca">
            <GraduationCap size={22} />
          </div>
          <div className="hidden flex-col sm:flex">
            <strong className="text-base font-semibold">EduTrack</strong>
            <small className="text-xs text-white/75">Atrasos na portaria</small>
          </div>
        </div>
        <nav
          className="flex min-w-0 flex-1 gap-1 lg:flex-none lg:flex-col"
          aria-label="Navegação principal"
        >
          {itensNavegacao.map(({ to, rotulo, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              viewTransition
              className={({ isActive: ativa }) =>
                `${classesLink} ${ativa ? `bg-white/10 text-white ${classesIndicador}` : 'text-white/80 hover:bg-white/5 hover:text-white'}`
              }
            >
              <Icone size={19} className="shrink-0" />
              <span>{rotulo}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

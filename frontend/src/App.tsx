import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, Package, RefreshCcw, Info, Hash, Search, X, Sun, Moon, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductTimeline from './components/ProductTimeline';

interface LeadTimeData {
  NUM_OP: string;
  C2_PRODUTO: string;
  QTD_OP: number;
  DATA_INICIO: string;
  COD_ROTEIRO: string;
  ZC_SIGLA: string;
  ZC_DIAS: number;
  DATA_PREVISTA: string;
}

interface OPGroup {
  numOp: string;
  produto: string;
  qtd: number;
  dataInicio: string;
  dataPrevistaFinal: string;
  steps: { sigla: string; dias: number; dataPrevista: string }[];
  totalDays: number;
}

const COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#eab308', '#d946ef', '#14b8a6'
];

const App: React.FC = () => {
  const [data, setData] = useState<OPGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siglaColors, setSiglaColors] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
  });

  // Apply theme to body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchData = async (search: string = '', year: string = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const serverIP = window.location.hostname;
      console.log(`Fetching from: http://${serverIP}:3001/api/leadtime?search=${search}&year=${year}`);
      
      const response = await axios.get<LeadTimeData[]>(`http://${serverIP}:3001/api/leadtime`, {
        params: { search, year },
        timeout: 10000
      });
      
      const grouped: { [key: string]: OPGroup } = {};
      const uniqueSiglas = new Set<string>();

      response.data.forEach((item) => {
        if (!grouped[item.NUM_OP]) {
          grouped[item.NUM_OP] = {
            numOp: item.NUM_OP,
            produto: item.C2_PRODUTO,
            qtd: item.QTD_OP,
            dataInicio: item.DATA_INICIO,
            dataPrevistaFinal: '', 
            steps: [],
            totalDays: 0,
          };
        }
        grouped[item.NUM_OP].steps.push({ 
            sigla: item.ZC_SIGLA, 
            dias: item.ZC_DIAS, 
            dataPrevista: item.DATA_PREVISTA 
        });
        // Total days for the timeline is the maximum dias among the steps
        if (item.ZC_DIAS > grouped[item.NUM_OP].totalDays) {
          grouped[item.NUM_OP].totalDays = item.ZC_DIAS;
        }
        uniqueSiglas.add(item.ZC_SIGLA);
      });

      // Post-process each group: sort steps and determine final date
      Object.values(grouped).forEach(group => {
        // Sort steps by dias ascending (e.g., USIN-1 with 8d comes before LTK with 37d)
        group.steps.sort((a, b) => a.dias - b.dias);
        
        // Find the maximum date among all steps for the header
        const dates = group.steps.map(s => {
            const [d, m, y] = s.dataPrevista.split('/');
            return new Date(`${y}-${m}-${d}`).getTime();
        });
        const maxDateIdx = dates.indexOf(Math.max(...dates));
        if (maxDateIdx !== -1) {
            group.dataPrevistaFinal = group.steps[maxDateIdx].dataPrevista;
        }
      });

      // Assign colors to siglas
      const colorsMap: { [key: string]: string } = {};
      Array.from(uniqueSiglas).forEach((sigla, idx) => {
        if (sigla) colorsMap[sigla] = COLORS[idx % COLORS.length];
      });
      setSiglaColors(colorsMap);

      const result = Object.values(grouped).sort((a, b) => (b.numOp || '').localeCompare(a.numOp || ''));
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(`Erro: ${err.message || 'Falha na comunicação com o servidor'}`);
    } finally {
      setLoading(false);
    }
  };  const formatProtheusDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    return `${d}/${m}/${y}`;
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(searchTerm, selectedYear);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedYear]);

  return (
    <div className="container-fluid min-h-screen pb-20 px-6">
      <header className="main-header border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="header-brand"
        >
          <BarChart3 className="text-primary" style={{width: 32, height: 32}} />
          <h1 className="title-gradient" style={{fontSize: '1.875rem', fontWeight: 900, margin: 0}}>
            Lead Time
          </h1>
        </motion.div>

        {/* Info / Total */}
        {!loading && data.length > 0 && (
          <div className="header-stats border-r border-white/10">
            <span className="stats-label">Total de OPs:</span>
            <span className="stats-val">{data.length}</span>
          </div>
        )}
        
        {/* Year Filter */}
        <div className="header-filter">
          <Calendar className="filter-icon" style={{width: 16, height: 16}} />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="glass-card filter-select"
          >
            <option value="all">Anos: Todos</option>
            <option value="2026">Ano: 2026</option>
            <option value="2025">Ano: 2025</option>
            <option value="2024">Ano: 2024</option>
            <option value="2023">Ano: 2023</option>
            <option value="2022">Ano: 2022</option>
            <option value="2021">Ano: 2021</option>
            <option value="2020">Ano: 2020</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="header-search">
          <Search className="search-icon" style={{width: 16, height: 16}} />
          <input 
            type="text" 
            placeholder="OP ou Produto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-card search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="search-clear"
            >
              <X style={{width: 16, height: 16}} />
            </button>
          )}
        </div>

        <div className="header-actions">
           <button 
              onClick={() => fetchData(searchTerm, selectedYear)}
              className="glass-card action-btn"
              title="Atualizar"
            >
              <RefreshCcw className={loading ? 'animate-spin' : ''} style={{width: 16, height: 16}} />
            </button>

            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="glass-card action-btn"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? <Sun style={{width: 16, height: 16}} /> : <Moon style={{width: 16, height: 16}} />}
            </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="loading-spinner" />
          <p className="text-text-muted mt-6 font-medium animate-pulse">Sincronizando com Protheus...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center max-w-2xl mx-auto border-accent/20">
            <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
               <Info className="text-accent w-8 h-8" />
            </div>
            <p className="text-text-main text-lg font-semibold mb-2">Ops! Algo deu errado.</p>
            <p className="text-text-muted mb-8">{error}</p>
            <button 
              onClick={() => fetchData(searchTerm, selectedYear)} 
              className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-bold transition-all"
            >
              Tentar novamente
            </button>
        </div>
      ) : data.length === 0 ? (
        <div className="glass-card p-16 text-center text-text-muted max-w-xl mx-auto">
          Nenhuma Ordem de Produção encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="">
          <div className="pb-12">
            <AnimatePresence mode="popLayout">
              {data.map((item, index) => (
                <motion.div
                  key={item.numOp}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card product-row border-l-4 border-l-primary"
                >
                  <div className="op-meta-row">
                    <div className="op-meta-item text-primary">
                       <Hash style={{width: 20, height: 20}} />
                       <span className="op-number">{item.numOp || 'N/A'}</span>
                    </div>

                    <div className="op-product-name text-white">
                      {(item.produto || 'Produto Indefinido').trim()}
                    </div>

                    <div className="op-meta-details">
                      <div className="op-meta-detail-item">
                        <span className="text-text-muted">Qtd</span>
                        <span className="text-text-main">{item.qtd || 0}</span>
                      </div>
                      <div className="op-meta-detail-item">
                        <span className="text-text-muted">Início</span>
                        <span className="text-text-main">{formatProtheusDate(item.dataInicio)}</span>
                      </div>
                      <div className="op-meta-detail-item">
                        <span className="text-primary gap-1">Previsão</span>
                        <span className="text-primary">{item.dataPrevistaFinal || '-'}</span>
                      </div>
                    </div>
                  </div>
                    
                    <div className="relative">
                       <ProductTimeline 
                        steps={item.steps} 
                        totalDays={item.totalDays} 
                        colors={siglaColors} 
                      />
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

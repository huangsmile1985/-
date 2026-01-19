
import React, { useState, useMemo } from 'react';
import { CompoundInfo, NumericalVariable, CategoricalVariable, Experiment } from './types';
import { generateExperimentPlan, analyzeChromatographyData } from './services/geminiService';
import { BeakerIcon, BrainCircuitIcon, ChevronDownIcon, ChevronUpIcon, FlaskIcon } from './components/icons';
import MarkdownRenderer from './components/MarkdownRenderer';

const initialCompoundInfo: CompoundInfo = { name: '', pka: '', structureInfo: '', column: 'C18, 2.1x50mm, 1.7µm' };

export default function App() {
  const [compoundInfo, setCompoundInfo] = useState<CompoundInfo>(initialCompoundInfo);
  const [numericalVariables, setNumericalVariables] = useState<NumericalVariable[]>([
    { id: 1, name: '有机相比例 (%)', low: '30', high: '70' },
    { id: 2, name: '柱温 (°C)', low: '30', high: '50' },
    { id: 3, name: 'pH', low: '3.0', high: '7.0' },
  ]);
  const [categoricalVariables, setCategoricalVariables] = useState<CategoricalVariable[]>([
    { id: 1, name: '色谱柱型号', options: 'C18, Phenyl-Hexyl' },
    { id: 2, name: '流动相B', options: '乙腈, 甲醇' },
  ]);
  const [experimentCount, setExperimentCount] = useState(8);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<string | null>('params');

  const handleToggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };
  
  // --- Variable Handlers ---
  const handleNumericalChange = (id: number, field: 'name' | 'low' | 'high', value: string) => {
    setNumericalVariables(vars => vars.map(v => v.id === id ? { ...v, [field]: value } : v));
  };
  const handleCategoricalChange = (id: number, field: 'name' | 'options', value: string) => {
    setCategoricalVariables(vars => vars.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError('');
    setExperiments([]);
    setAnalysisResult(null);
    try {
      const plan = await generateExperimentPlan({ compoundInfo, numericalVariables, categoricalVariables, experimentCount });
      setExperiments(plan);
      setOpenSection('matrix');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExperimentDataChange = (index: number, field: keyof Experiment, value: string | number) => {
    const newExperiments = [...experiments];
    const exp = { ...newExperiments[index], [field]: value };

    if (['tr1', 'tr2', 'w1', 'w2'].includes(field as string)) {
        const tr1 = Number(exp.tr1);
        const tr2 = Number(exp.tr2);
        const w1 = Number(exp.w1);
        const w2 = Number(exp.w2);
        if (tr1 > 0 && tr2 > 0 && w1 > 0 && w2 > 0) {
            exp.rs = (2 * Math.abs(tr2 - tr1)) / (w1 + w2);
        } else {
            exp.rs = 0;
        }
    }
    newExperiments[index] = exp;
    setExperiments(newExperiments);
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);
    try {
      const result = await analyzeChromatographyData({ compoundInfo, numericalVariables, categoricalVariables, experiments });
      setAnalysisResult(result);
      setOpenSection('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const isPlanReady = compoundInfo.name && experimentCount >= 5 && experimentCount <= 15;
  const areResultsComplete = experiments.length > 0 && experiments.every(exp => exp.tr1 > 0 && exp.tr2 > 0 && exp.w1 > 0 && exp.w2 > 0 && exp.asymmetry > 0);
  const variableHeaders = [...categoricalVariables.map(v => v.name), ...numericalVariables.map(v => v.name)];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-4">
                <BeakerIcon className="h-12 w-12 text-blue-600" />
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">专家级色谱方法开发系统</h1>
            </div>
            <p className="mt-2 text-lg text-slate-600 max-w-3xl mx-auto">
                AI驱动的多维变量DOE设计，智能预测最优色谱条件。
            </p>
        </header>
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <button onClick={() => handleToggleSection('params')} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
              <h2 className="text-xl font-semibold flex items-center gap-3"><FlaskIcon className="w-6 h-6 text-blue-500" />第一步: 定义实验参数</h2>
              {openSection === 'params' ? <ChevronUpIcon className="w-6 h-6"/> : <ChevronDownIcon className="w-6 h-6"/>}
            </button>
            {openSection === 'params' && (
            <div className="p-6 space-y-8">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-slate-700">待分析物信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="化合物名称" value={compoundInfo.name} onChange={(e) => setCompoundInfo({...compoundInfo, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/>
                    <input type="text" placeholder="pKa (可选)" value={compoundInfo.pka} onChange={(e) => setCompoundInfo({...compoundInfo, pka: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/>
                    <input type="text" placeholder="结构或极性信息" value={compoundInfo.structureInfo} onChange={(e) => setCompoundInfo({...compoundInfo, structureInfo: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-slate-700">分类变量 (Categorical)</h3>
                   {categoricalVariables.map(v => (
                    <div key={v.id} className="grid grid-cols-2 gap-2 mb-2">
                        <input value={v.name} onChange={e => handleCategoricalChange(v.id, 'name', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="变量名, 如 色谱柱"/>
                        <input value={v.options} onChange={e => handleCategoricalChange(v.id, 'options', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="选项, 如 C18, Phenyl"/>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-slate-700">数值变量 (Numerical)</h3>
                  {numericalVariables.map(v => (
                    <div key={v.id} className="grid grid-cols-3 gap-2 mb-2">
                        <input value={v.name} onChange={e => handleNumericalChange(v.id, 'name', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="变量名, 如 pH"/>
                        <input value={v.low} onChange={e => handleNumericalChange(v.id, 'low', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="低点"/>
                        <input value={v.high} onChange={e => handleNumericalChange(v.id, 'high', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="高点"/>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">实验总数 (5-15)</label>
                    <input type="number" min="5" max="15" value={experimentCount} onChange={e => setExperimentCount(parseInt(e.target.value, 10))} className="w-28 p-2 border border-slate-300 rounded-md"/>
                </div>
                <button onClick={handleGeneratePlan} disabled={!isPlanReady || isLoading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-slate-400">
                  {isLoading ? '生成中...' : '生成实验清单'}
                </button>
              </div>
            </div>
            )}
          </div>
          
          {experiments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <button onClick={() => handleToggleSection('matrix')} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                <h2 className="text-xl font-semibold flex items-center gap-3"><FlaskIcon className="w-6 h-6 text-green-500" />第二步: 填入实验结果</h2>
                {openSection === 'matrix' ? <ChevronUpIcon className="w-6 h-6"/> : <ChevronDownIcon className="w-6 h-6"/>}
            </button>
            {openSection === 'matrix' && (
            <div className="p-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 border">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">序号</th>
                                {variableHeaders.map(h => <th key={h} className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>)}
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">tR1</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">W1</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">tR2</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">W2</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">对称性</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rs (calc.)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {experiments.map((exp, index) => (
                                <tr key={exp.run}>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium">{exp.run}</td>
                                    {variableHeaders.map(h => <td key={h} className="px-2 py-2 text-sm">{exp.conditions[h]}</td>)}
                                    {['tr1', 'w1', 'tr2', 'w2', 'asymmetry'].map(key => (
                                        <td key={key} className="px-1 py-1"><input type="number" value={(exp as any)[key] || ''} onChange={e => handleExperimentDataChange(index, key as keyof Experiment, e.target.value)} className="w-20 p-2 border rounded-md"/></td>
                                    ))}
                                    <td className="px-2 py-2 text-sm font-semibold text-blue-600">{exp.rs > 0 ? exp.rs.toFixed(2) : '...'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleAnalyze} disabled={!areResultsComplete || isLoading} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-slate-400 flex items-center gap-2">
                        {isLoading && analysisResult === null ? '分析中...' : <><BrainCircuitIcon className="w-5 h-5" /> AI专家分析</>}
                    </button>
                </div>
            </div>
            )}
          </div>
          )}

          {(isLoading || analysisResult || error) && (
            <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                <button onClick={() => handleToggleSection('results')} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100">
                    <h2 className="text-xl font-semibold flex items-center gap-3"><BrainCircuitIcon className="w-6 h-6 text-purple-500" />第三步: AI分析与推荐</h2>
                    {openSection === 'results' ? <ChevronUpIcon className="w-6 h-6"/> : <ChevronDownIcon className="w-6 h-6"/>}
                </button>
                {openSection === 'results' && (
                <div className="p-6">
                    {isLoading && !analysisResult && <div className="text-center p-8"><p className="text-lg">正在分析数据，请稍候...</p></div>}
                    {error && <div className="p-4 bg-red-100 border-red-500 text-red-700"><p className="font-bold">分析出错</p><p>{error}</p></div>}
                    {analysisResult && (
                        <div className="prose prose-slate max-w-none">
                            <MarkdownRenderer content={analysisResult} />
                        </div>
                    )}
                </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { GoogleGenAI } from "@google/genai";
import { PlanGenerationParams, Experiment, AnalysisParams, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function generateExperimentPlan(params: PlanGenerationParams): Promise<Experiment[]> {
  const { compoundInfo, numericalVariables, categoricalVariables, experimentCount } = params;

  const prompt = `
# 角色
你是一位世界级的色谱方法开发专家，精通实验设计（DOE）。

# 任务
为以下实验目标设计一个高效的实验清单。请综合考虑所有变量，生成一个包含 ${experimentCount} 次实验的矩阵。设计应尽可能覆盖变量空间，以最少的实验次数获取最多的信息。

## 实验信息
- **待分析物**: ${compoundInfo.name} (${compoundInfo.structureInfo})
- **数值变量 (范围)**:
${numericalVariables.map(v => `  - ${v.name}: [${v.low}, ${v.high}]`).join('\n')}
- **分类变量 (选项)**:
${categoricalVariables.map(v => `  - ${v.name}: [${v.options}]`).join('\n')}

# 输出要求
你的回复必须是一个 JSON 数组，其中每个对象代表一次实验。不要包含任何解释性文本或 markdown 代码块。

JSON 格式示例:
\`\`\`json
[
  {
    "run": 1,
    "conditions": {
      "色谱柱型号": "C18",
      "流动相B": "乙腈",
      "有机相比例 (%)": 30,
      "柱温 (°C)": 40,
      "pH": 3.0
    }
  },
  {
    "run": 2,
    "conditions": {
      "色谱柱型号": "Phenyl-Hexyl",
      "流动相B": "甲醇",
      "有机相比例 (%)": 70,
      "柱温 (°C)": 50,
      "pH": 5.0
    }
  }
]
\`\`\`
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });
    
    const plan = JSON.parse(response.text!) as Array<{run: number; conditions: {[key: string]: string | number}}>;
    // Initialize result fields
    return plan.map(p => ({ ...p, tr1: 0, w1: 0, tr2: 0, w2: 0, asymmetry: 0, rs: 0 }));

  } catch (error) {
    console.error("Error generating experiment plan:", error);
    throw new Error("AI未能成功生成实验计划。请检查变量定义是否清晰。");
  }
}

export async function analyzeChromatographyData(params: AnalysisParams): Promise<AnalysisResult> {
    const { compoundInfo, experiments, numericalVariables, categoricalVariables } = params;

    const dataAsMarkdown = `
| 序号 | ${Object.keys(experiments[0].conditions).join(' | ')} | tR1 | W1 | tR2 | W2 | 对称性 | Rs |
|---|${Object.keys(experiments[0].conditions).map(() => '---').join('|')}---|---|---|---|---|---|---|
${experiments.map(exp => 
    `| ${exp.run} | ${Object.values(exp.conditions).join(' | ')} | ${exp.tr1} | ${exp.w1} | ${exp.tr2} | ${exp.w2} | ${exp.asymmetry} | ${exp.rs.toFixed(2)} |`
).join('\n')}
`;

    const prompt = `
# 角色
你是一位拥有20年经验的分析化学家和数据建模师，擅长解读复杂的DOE数据，模拟ACD/Labs的分析逻辑。你的交互语言为全中文。

# 任务
基于用户提供的实验数据，进行深入分析，找出关键影响因素，并推荐最优的色谱条件组合。

## 1. 实验背景
- **待分析物**: ${compoundInfo.name} (pKa: ${compoundInfo.pka || '未提供'}, 结构/极性: ${compoundInfo.structureInfo})
- **优化变量**:
    - 分类变量: ${categoricalVariables.map(v => v.name).join(', ')}
    - 数值变量: ${numericalVariables.map(v => v.name).join(', ')}
- **主要目标**: 找到能使分离度 (Rs) ≥ 1.5 且峰形良好 (对称性接近1.0) 的条件。

## 2. 实验数据
${dataAsMarkdown}

## 3. 分析与推荐流程
请遵循以下步骤，并用清晰的Markdown格式组织你的报告：

1.  **数据趋势分析**: 简要描述你观察到的总体趋势。例如，哪种色谱柱或流动相表现出更好的分离潜力？pH或有机相比例对保留和分离度有何影响？
2.  **关键因素识别 (Python 回归分析)**: 使用你的Python工具进行回归分析（例如，使用\`statsmodels\`进行含分类变量的多元线性回归），找出对分离度(Rs)和对称性影响最显著的**1-2个关键因素**。将结果以表格形式呈现。
    
    **关键因素展示表格**:
    | 影响因素 | 对分离度(Rs)的贡献 | 备注 |
    |---|---|---|
    | (例如: 色谱柱型号) | (例如: 显著正相关) | (例如: Phenyl柱显著优于C18) |
    | (例如: pH) | (例如: 显著负相关) | (例如: 较低pH有利于分离) |

3.  **ACD/Labs仿真推荐**:
    -   **最优条件推荐**: 基于你的数据模型和化学知识，给出一个最优的条件组合（包括所有分类和数值变量）。
    -   **科学原理解释**: 解释为什么你推荐这个组合。例如，为什么某个色谱柱更适合（考虑到π-π相互作用、氢键等）？为什么该稀释剂能避免溶剂效应？为什么这个pH能确保分析物处于理想的电荷状态？
    -   **预期表现**: 描述在该条件下预期的色谱图表现（预期的Rs、峰形、保留时间范围）。

请将你的最终报告以一个完整的Markdown文档形式输出。
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });
        return response.text!;
    } catch (error) {
        console.error("Error analyzing experiment data:", error);
        throw new Error("AI分析数据时发生错误。");
    }
}
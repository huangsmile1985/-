
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {

  const renderContent = () => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let listItems: React.ReactElement[] = [];
    let inTable = false;
    let tableHeaders: React.ReactElement[] = [];
    let tableRows: React.ReactElement[][] = [];

    const closeList = () => {
      if (inList && listType) {
        if (listType === 'ul') {
          elements.push(<ul key={elements.length} className="list-disc list-inside space-y-1 my-3 pl-4">{listItems}</ul>);
        } else {
          elements.push(<ol key={elements.length} className="list-decimal list-inside space-y-1 my-3 pl-4">{listItems}</ol>);
        }
        inList = false;
        listItems = [];
        listType = null;
      }
    };
    
    const closeTable = () => {
        if (inTable) {
             elements.push(
                <div key={elements.length} className="overflow-x-auto my-4 border border-slate-200 rounded-md">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">{tableHeaders}</thead>
                        <tbody className="bg-white divide-y divide-slate-200">{tableRows.map((row, i) => <tr key={i}>{row}</tr>)}</tbody>
                    </table>
                </div>
            );
            inTable = false;
            tableHeaders = [];
            tableRows = [];
        }
    }
    
    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        closeList(); closeTable();
        elements.push(<h3 key={index} className="text-xl font-semibold mt-6 mb-2 pb-1 border-b border-slate-200">{line.substring(4)}</h3>);
        return;
      }
      if (line.startsWith('## ')) {
        closeList(); closeTable();
        elements.push(<h2 key={index} className="text-2xl font-bold mt-8 mb-3 pb-2 border-b border-slate-300">{line.substring(3)}</h2>);
        return;
      }
      if (line.startsWith('# ')) {
        closeList(); closeTable();
        elements.push(<h1 key={index} className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-slate-300">{line.substring(2)}</h1>);
        return;
      }

      // Format text (bold, italic, code)
      const formatText = (text: string) => {
          return text
          .split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
          .map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
            if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
            return part;
          });
      };

      // Table
      if (line.startsWith('|') && line.endsWith('|')) {
        closeList();
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (!inTable) {
            inTable = true;
            tableHeaders.push(<tr key={`header-${index}`}>{cells.map((cell, i) => <th key={i} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{formatText(cell)}</th>)}</tr>);
        } else if (!line.match(/\|-{3,}\|/)) { // Not a separator line
            tableRows.push(cells.map((cell, i) => <td key={i} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatText(cell)}</td>));
        }
        return;
      }

      closeTable();

      // Lists
      if (line.match(/^(\s*)-\s/)) {
        if (listType !== 'ul') {
          closeList(); inList = true; listType = 'ul';
        }
        listItems.push(<li key={index}>{formatText(line.replace(/^(\s*)-\s/, ''))}</li>);
        return;
      }
      if (line.match(/^(\s*)\d+\.\s/)) {
        if (listType !== 'ol') {
          closeList(); inList = true; listType = 'ol';
        }
        listItems.push(<li key={index}>{formatText(line.replace(/^(\s*)\d+\.\s/, ''))}</li>);
        return;
      }
      
      closeList();

      // Paragraphs
      if (line.trim() !== '') {
        elements.push(<p key={index} className="my-3 leading-relaxed">{formatText(line)}</p>);
      }
    });

    closeList();
    closeTable();
    return elements;
  };

  return <div>{renderContent()}</div>;
};

export default MarkdownRenderer;

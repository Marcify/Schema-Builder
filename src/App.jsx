import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragOverlay,
  closestCenter 
} from '@dnd-kit/core';
import { 
  BookOpen, 
  Database, 
  Key, 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ArrowRight,
  RefreshCw,
  Clock,
  Menu,
  X
} from 'lucide-react';

/**
 * SCHEMA BUILDER
 * An educational game for Database Normalization (1NF, 2NF, 3NF)
 */

// --- DATA SETS ---

const PROBLEM_SETS = {
  university: {
    id: 'university',
    name: 'University System',
    levels: [
      {
        level: 1,
        title: 'First Normal Form (1NF)',
        description: 'Eliminate repeating groups. The "Student_Grade_Report" table currently stores multiple courses and grades in a single row per student (repeating groups). Break this down so each record is atomic.',
        hint: 'Separate the repeating course data into its own table. You will need a way to link it back to the student.',
        initialAttributes: [
          { id: 's1', name: 'StudentID', type: 'int', source: 'pool' },
          { id: 's2', name: 'StudentName', type: 'varchar', source: 'pool' },
          { id: 'c1', name: 'CourseID', type: 'varchar', source: 'pool' },
          { id: 'g1', name: 'Grade', type: 'char', source: 'pool' },
          { id: 's1_ref', name: 'StudentID', type: 'int', source: 'pool' }, // Duplicate for FK
        ],
        solution: [
          {
            mustContain: ['StudentID', 'StudentName'],
            pks: ['StudentID'],
            fks: []
          },
          {
            mustContain: ['StudentID', 'CourseID', 'Grade'],
            pks: ['StudentID', 'CourseID'], // Composite PK often used in 1NF/link tables
            fks: ['StudentID']
          }
        ],
        anomalies: {
          insert: 'Cannot add a new course without having a student enrolled in it yet.',
          delete: 'Deleting a student might delete all history of a course if it was the only record.',
          update: 'Inconsistent data if a student changes name in one row but not others.'
        }
      },
      {
        level: 2,
        title: 'Second Normal Form (2NF)',
        description: 'Eliminate partial dependencies. We have an "Enrollment" table with a composite key (StudentID, CourseID). However, "StudentAge" depends only on StudentID, and "CourseFee" depends only on CourseID.',
        hint: 'Move attributes that depend on only PART of the primary key to their own tables.',
        initialAttributes: [
          { id: 's1', name: 'StudentID', type: 'int', source: 'pool' },
          { id: 'c1', name: 'CourseID', type: 'varchar', source: 'pool' },
          { id: 'sa1', name: 'StudentAge', type: 'int', source: 'pool' },
          { id: 'cf1', name: 'CourseFee', type: 'decimal', source: 'pool' },
          { id: 's1_ref', name: 'StudentID', type: 'int', source: 'pool' },
          { id: 'c1_ref', name: 'CourseID', type: 'varchar', source: 'pool' },
          { id: 's1_ref2', name: 'StudentID', type: 'int', source: 'pool' }, // For join table
          { id: 'c1_ref2', name: 'CourseID', type: 'varchar', source: 'pool' }, // For join table
        ],
        solution: [
          {
            mustContain: ['StudentID', 'StudentAge'],
            pks: ['StudentID'],
            fks: []
          },
          {
            mustContain: ['CourseID', 'CourseFee'],
            pks: ['CourseID'],
            fks: []
          },
          {
            mustContain: ['StudentID', 'CourseID'],
            pks: ['StudentID', 'CourseID'],
            fks: ['StudentID', 'CourseID']
          }
        ],
        anomalies: {
          insert: 'Cannot create a new course with a fee unless a student is enrolled.',
          update: 'Updating a course fee requires updating every single enrollment record for that course.',
          delete: 'Deleting the last student enrolled in a course removes the course and its fee data entirely.'
        }
      },
      {
        level: 3,
        title: 'Third Normal Form (3NF)',
        description: 'Eliminate transitive dependencies. In the "Employee_Project" table, we have EmployeeID -> DepartmentID, and DepartmentID -> DepartmentLocation. Location depends on Dept, not directly on Employee.',
        hint: 'Separate attributes that depend on non-key attributes (transitive dependency).',
        initialAttributes: [
          { id: 'e1', name: 'EmpID', type: 'int', source: 'pool' },
          { id: 'en1', name: 'EmpName', type: 'varchar', source: 'pool' },
          { id: 'd1', name: 'DeptID', type: 'int', source: 'pool' },
          { id: 'dl1', name: 'DeptLoc', type: 'varchar', source: 'pool' },
          { id: 'd1_ref', name: 'DeptID', type: 'int', source: 'pool' },
        ],
        solution: [
          {
            mustContain: ['EmpID', 'EmpName', 'DeptID'],
            pks: ['EmpID'],
            fks: ['DeptID']
          },
          {
            mustContain: ['DeptID', 'DeptLoc'],
            pks: ['DeptID'],
            fks: []
          }
        ],
        anomalies: {
          insert: 'Cannot record a new department location without assigning an employee to it.',
          update: 'Moving a department to a new location requires updating every employee record in that department.',
          delete: 'Firing the last employee in a department deletes the department location data.'
        }
      }
    ]
  },
  retail: {
    id: 'retail',
    name: 'Retail Inventory',
    levels: [
      {
        level: 1,
        title: '1NF: Sales Record',
        description: 'The "Daily_Sales" table stores a list of items sold in a single cell (e.g., "Apple, Banana, Milk"). This is a multi-valued attribute.',
        hint: 'Each item sold should be a separate record. Create a Sales table and a Sales_Items table.',
        initialAttributes: [
          { id: 'r1', name: 'ReceiptID', type: 'int', source: 'pool' },
          { id: 'd1', name: 'Date', type: 'date', source: 'pool' },
          { id: 'p1', name: 'ProductID', type: 'int', source: 'pool' },
          { id: 'q1', name: 'Quantity', type: 'int', source: 'pool' },
          { id: 'r1_ref', name: 'ReceiptID', type: 'int', source: 'pool' },
        ],
        solution: [
          {
            mustContain: ['ReceiptID', 'Date'],
            pks: ['ReceiptID'],
            fks: []
          },
          {
            mustContain: ['ReceiptID', 'ProductID', 'Quantity'],
            pks: ['ReceiptID', 'ProductID'],
            fks: ['ReceiptID']
          }
        ],
        anomalies: {
            insert: 'Difficult to query specific product sales volume.',
            update: 'Complex parsing required to change quantity of one item.',
            delete: 'Cannot remove one item from a list easily.'
        }
      },
      {
        level: 2,
        title: '2NF: Product Supplier',
        description: 'Table Key: (ProductID, SupplierID). "ProductName" depends only on ProductID. "SupplierCity" depends only on SupplierID. "Price" depends on both (negotiated price).',
        hint: 'Split the table so attributes depend on the WHOLE key, not just part of it.',
        initialAttributes: [
          { id: 'p1', name: 'ProductID', type: 'int', source: 'pool' },
          { id: 'pn1', name: 'ProdName', type: 'varchar', source: 'pool' },
          { id: 's1', name: 'SupplierID', type: 'int', source: 'pool' },
          { id: 'sc1', name: 'SuppCity', type: 'varchar', source: 'pool' },
          { id: 'pr1', name: 'Price', type: 'decimal', source: 'pool' },
          { id: 'p1_ref', name: 'ProductID', type: 'int', source: 'pool' },
          { id: 's1_ref', name: 'SupplierID', type: 'int', source: 'pool' },
          { id: 'p1_ref2', name: 'ProductID', type: 'int', source: 'pool' }, // Extra for join
          { id: 's1_ref2', name: 'SupplierID', type: 'int', source: 'pool' }, // Extra for join
        ],
        solution: [
            {
              mustContain: ['ProductID', 'ProdName'],
              pks: ['ProductID'],
              fks: []
            },
            {
              mustContain: ['SupplierID', 'SuppCity'],
              pks: ['SupplierID'],
              fks: []
            },
            {
              mustContain: ['ProductID', 'SupplierID', 'Price'],
              pks: ['ProductID', 'SupplierID'],
              fks: ['ProductID', 'SupplierID']
            }
        ],
        anomalies: {
            insert: 'Cannot add a supplier unless they supply a product.',
            update: 'Changing a product name requires updating every supply contract for it.',
            delete: 'Deleting all supply contracts deletes the supplier info.'
        }
      },
      {
        level: 3,
        title: '3NF: Customer Orders',
        description: 'Order Table: OrderID -> CustomerID -> CustomerZip -> ZipState. ZipState depends on CustomerZip, which depends on CustomerID.',
        hint: 'Remove the transitive chain. Zip codes determine states, not the Customer directly.',
        initialAttributes: [
          { id: 'o1', name: 'OrderID', type: 'int', source: 'pool' },
          { id: 'c1', name: 'CustID', type: 'int', source: 'pool' },
          { id: 'z1', name: 'ZipCode', type: 'varchar', source: 'pool' },
          { id: 'st1', name: 'State', type: 'varchar', source: 'pool' },
          { id: 'z1_ref', name: 'ZipCode', type: 'varchar', source: 'pool' },
        ],
        solution: [
            {
                mustContain: ['OrderID', 'CustID', 'ZipCode'],
                pks: ['OrderID'],
                fks: ['ZipCode'] // Technically Zip is FK to ZipTable
            },
            {
                mustContain: ['ZipCode', 'State'],
                pks: ['ZipCode'],
                fks: []
            }
        ],
        anomalies: {
            insert: 'Cannot add a valid Zip-State pair without a customer order.',
            update: 'Updating a state for a zip code requires checking all orders.',
            delete: 'Deleting all orders for a zip code deletes the state mapping.'
        }
      }
    ]
  }
};

// --- COMPONENTS ---

// 1. Draggable Attribute
const DraggableAttribute = ({ attribute, isSource }) => {
    // We implement a simple click-to-select approach for reliability in this demo,
    // but visualize it like a draggable chip.
    return (
      <div 
        className={`
          group relative flex items-center justify-between
          px-3 py-2 m-1 rounded shadow-sm text-sm font-medium border
          cursor-grab active:cursor-grabbing transition-all select-none
          ${isSource 
            ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md text-slate-700' 
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'}
        `}
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData('attrId', attribute.id);
          e.dataTransfer.setData('source', isSource ? 'pool' : 'table');
        }}
      >
        <div className="flex items-center gap-2">
          <Database size={14} className={isSource ? "text-slate-400" : "text-indigo-500"} />
          <span>{attribute.name}</span>
          <span className="text-[10px] text-slate-400 uppercase ml-1 font-mono">{attribute.type}</span>
        </div>
      </div>
    );
};

// 2. Table Workspace Node
const TableNode = ({ 
    table, 
    onDrop, 
    onRemoveAttr, 
    onTogglePK, 
    onToggleFK, 
    onDeleteTable 
}) => {
    const [isOver, setIsOver] = useState(false);
  
    const handleDragOver = (e) => {
      e.preventDefault();
      setIsOver(true);
    };
  
    const handleDragLeave = () => {
      setIsOver(false);
    };
  
    const handleDrop = (e) => {
      e.preventDefault();
      setIsOver(false);
      const attrId = e.dataTransfer.getData('attrId');
      if (attrId) {
        onDrop(table.id, attrId);
      }
    };
  
    return (
      <div 
        className={`
          flex flex-col w-64 min-h-[200px] rounded-lg border-2 bg-white shadow-lg transition-all
          ${isOver ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Table Header */}
        <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center rounded-t-lg">
          <span className="font-bold text-slate-700 text-sm">Table_{table.id}</span>
          <button 
            onClick={() => onDeleteTable(table.id)}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Delete Table"
          >
            <Trash2 size={16} />
          </button>
        </div>
  
        {/* Table Body */}
        <div className="flex-1 p-2 flex flex-col gap-1">
          {table.attributes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded m-2">
              <Plus size={24} className="mb-1 opacity-50" />
              Drop attributes here
            </div>
          ) : (
            table.attributes.map((attr) => (
              <div 
                key={attr.instanceId || attr.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-sm shadow-sm group hover:border-indigo-300"
              >
                <div className="flex items-center gap-2">
                   {/* Key Toggles */}
                   <button 
                    onClick={() => onTogglePK(table.id, attr.instanceId)}
                    className={`p-1 rounded transition-colors ${attr.isPK ? 'text-yellow-500 bg-yellow-50' : 'text-slate-300 hover:text-yellow-400'}`}
                    title="Toggle Primary Key"
                  >
                    <Key size={14} fill={attr.isPK ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={() => onToggleFK(table.id, attr.instanceId)}
                    className={`p-1 rounded transition-colors ${attr.isFK ? 'text-blue-500 bg-blue-50' : 'text-slate-300 hover:text-blue-400'}`}
                    title="Toggle Foreign Key"
                  >
                    <LinkIcon size={14} />
                  </button>
                  <span className={`font-medium ${attr.isPK ? 'underline decoration-yellow-500' : ''}`}>
                    {attr.name}
                  </span>
                </div>
                
                <button 
                  onClick={() => onRemoveAttr(table.id, attr.instanceId)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
};

// --- MAIN GAME COMPONENT ---

export default function SchemaBuilder() {
  // State
  const [activeSet, setActiveSet] = useState('university');
  const [levelIndex, setLevelIndex] = useState(0);
  const [tables, setTables] = useState([]);
  const [pool, setPool] = useState([]);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string, detail: string }
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Guard against undefined problem set (should not happen with correct keys, but safe practice)
  const currentSet = PROBLEM_SETS[activeSet];
  const currentScenario = currentSet ? currentSet.levels[levelIndex] : null;

  // Initialize Level
  useEffect(() => {
    if (currentScenario) {
        resetLevel();
    }
  }, [activeSet, levelIndex]);

  // Timer
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const resetLevel = () => {
    if (!currentScenario) return;
    
    // Add unique instance IDs to pool attributes so we can track duplicates if needed
    const initialPool = currentScenario.initialAttributes.map(attr => ({
      ...attr,
      instanceId: Math.random().toString(36).substr(2, 9),
      isPK: false,
      isFK: false
    }));
    setPool(initialPool);
    setTables([{ id: 1, attributes: [] }]); // Start with 1 empty table
    setFeedback(null);
    setTimer(0);
    setIsTimerRunning(true);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- ACTIONS ---

  const addTable = () => {
    const newId = tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1;
    setTables([...tables, { id: newId, attributes: [] }]);
  };

  const deleteTable = (id) => {
    // Return attributes to pool (optional, but good UX)
    const tableToDelete = tables.find(t => t.id === id);
    if (!tableToDelete) return;
    
    // In this specific mechanic, we might just delete them or push back to pool. 
    // Let's push back to pool to avoid losing pieces.
    const restoredAttrs = tableToDelete.attributes.map(a => ({...a, isPK: false, isFK: false}));
    setPool([...pool, ...restoredAttrs]);
    setTables(tables.filter(t => t.id !== id));
  };

  const handleDropAttribute = (tableId, attrId) => {
    // Find attribute in pool
    const attrIndex = pool.findIndex(a => a.id === attrId || a.instanceId === attrId); // Support dragging by raw ID or unique ID
    
    if (attrIndex === -1) {
        // Must be moving from another table?
        // For simplicity in this version: Only Pool -> Table allowed. 
        // If users want to move between tables, they delete and re-add.
        return;
    }

    const attr = pool[attrIndex];
    const newPool = [...pool];
    newPool.splice(attrIndex, 1);
    setPool(newPool);

    setTables(tables.map(t => {
      if (t.id === tableId) {
        return { ...t, attributes: [...t.attributes, { ...attr }] };
      }
      return t;
    }));
  };

  const removeAttrFromTable = (tableId, instanceId) => {
    const table = tables.find(t => t.id === tableId);
    const attr = table.attributes.find(a => a.instanceId === instanceId);
    
    // Remove from table
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return { ...t, attributes: t.attributes.filter(a => a.instanceId !== instanceId) };
      }
      return t;
    }));

    // Add back to pool
    if (attr) {
      setPool([...pool, { ...attr, isPK: false, isFK: false }]);
    }
  };

  const togglePK = (tableId, instanceId) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          attributes: t.attributes.map(a => 
            a.instanceId === instanceId ? { ...a, isPK: !a.isPK } : a
          )
        };
      }
      return t;
    }));
  };

  const toggleFK = (tableId, instanceId) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          attributes: t.attributes.map(a => 
            a.instanceId === instanceId ? { ...a, isFK: !a.isFK } : a
          )
        };
      }
      return t;
    }));
  };

  // --- VALIDATION LOGIC ---

  const validateSolution = () => {
    if (!currentScenario) return;
    const solutionRules = currentScenario.solution;
    
    // 1. Check Table Count (Heuristic: usually roughly same number of tables)
    if (tables.length < solutionRules.length) {
      setFeedback({
        type: 'error',
        message: 'Not enough tables.',
        detail: `You have ${tables.length} tables, but the normalized form typically requires at least ${solutionRules.length}.`
      });
      return;
    }

    // 2. Check each required solution grouping exists
    let allRulesMet = true;
    let errorDetail = '';

    // Create a simple map of user's tables for easier checking
    // { tableId: { names: Set, pks: Set, fks: Set } }
    const userTables = tables.map(t => ({
      names: new Set(t.attributes.map(a => a.name)),
      pks: new Set(t.attributes.filter(a => a.isPK).map(a => a.name)),
      fks: new Set(t.attributes.filter(a => a.isFK).map(a => a.name)),
    }));

    for (const rule of solutionRules) {
      // Find a user table that matches this rule
      // A match means it contains ALL 'mustContain' attributes
      const match = userTables.find(ut => 
        rule.mustContain.every(req => ut.names.has(req))
      );

      if (!match) {
        allRulesMet = false;
        errorDetail = `Could not find a table containing the group: [${rule.mustContain.join(', ')}]. This grouping is essential for ${currentScenario.title}.`;
        break;
      }

      // Check Keys for this matched table
      const pksMatch = rule.pks.every(reqPk => match.pks.has(reqPk)) && match.pks.size === rule.pks.length;
      if (!pksMatch) {
        allRulesMet = false;
        errorDetail = `A table has the right data [${rule.mustContain.join(', ')}], but the Primary Key is incorrect. Expected PK: ${rule.pks.join(', ')}.`;
        break;
      }

      // Check FKs (loosely, just ensure they are marked)
      const fksMatch = rule.fks.every(reqFk => match.fks.has(reqFk));
      if (!fksMatch) {
        allRulesMet = false;
        errorDetail = `A table [${rule.mustContain.join(', ')}] is missing Foreign Key markings. Expected FKs: ${rule.fks.join(', ')}.`;
        break;
      }
    }

    if (allRulesMet) {
      // Check for stray attributes or extra empty tables
      const totalAttrsUsed = tables.reduce((acc, t) => acc + t.attributes.length, 0);
      const totalAttrsRequired = solutionRules.reduce((acc, r) => acc + r.mustContain.length, 0);
      
      // We allow some flexibility, but if user has massive tables left over?
      // Actually, standard normalization implies no redundancy.
      // But we will be lenient on "extra" duplicates if the core structure is there.

      setIsTimerRunning(false);
      setFeedback({
        type: 'success',
        message: 'Normalization Complete!',
        detail: `Great job! You successfully transformed the schema to ${currentScenario.title}.`
      });
    } else {
      // Pick a random anomaly explanation relevant to the failure if generic error isn't enough
      const anomalyKeys = Object.keys(currentScenario.anomalies);
      const randomAnomaly = currentScenario.anomalies[anomalyKeys[Math.floor(Math.random() * anomalyKeys.length)]];
      
      setFeedback({
        type: 'error',
        message: 'Validation Failed',
        detail: `${errorDetail} \n\nRemember the consequence: ${randomAnomaly}`
      });
    }
  };

  const nextLevel = () => {
    if (!currentSet) return;
    if (levelIndex < currentSet.levels.length - 1) {
      setLevelIndex(levelIndex + 1);
    } else {
      // End of set
      setFeedback({
        type: 'complete',
        message: 'Set Complete!',
        detail: 'You have mastered this scenario. Try the next problem set!'
      });
    }
  };

  // --- RENDER ---

  // Handle Loading/Error States safely
  if (!currentSet || !currentScenario) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-100">
              <div className="bg-white p-6 rounded shadow-lg">
                  <h2 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h2>
                  <p className="text-slate-600">The requested problem set could not be found.</p>
                  <button onClick={() => { setActiveSet('university'); setLevelIndex(0); }} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">
                      Reset Application
                  </button>
              </div>
          </div>
      );
  }

  if (showIntro) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
                <div className="flex items-center gap-3 mb-6">
                    <Database className="text-indigo-600" size={40} />
                    <h1 className="text-3xl font-bold text-slate-800">Schema Builder</h1>
                </div>
                <p className="text-slate-600 text-lg mb-8">
                    Master database normalization through rapid, hands-on puzzles.
                    Eliminate anomalies, assign keys, and build efficient schemas in 5-minute sprints.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {Object.values(PROBLEM_SETS).map((set) => (
                        <button
                            key={set.id}
                            onClick={() => { setActiveSet(set.id); setLevelIndex(0); setShowIntro(false); }}
                            className="group p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                        >
                            <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-indigo-700">{set.name}</h3>
                            <p className="text-slate-500 text-sm">3 Levels: 1NF, 2NF, 3NF</p>
                            <div className="mt-4 flex items-center text-indigo-600 font-medium">
                                Start Session <ArrowRight size={16} className="ml-2" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={() => setShowIntro(true)} className="p-2 hover:bg-slate-100 rounded-full">
                <Menu size={20} className="text-slate-500"/>
            </button>
            <div>
                <h1 className="font-bold text-lg flex items-center gap-2">
                    <Database size={18} className="text-indigo-600" />
                    Schema Builder
                </h1>
                <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">
                    {currentSet.name} • Level {currentScenario.level}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                <Clock size={14} />
                <span className="font-mono text-sm font-medium">{formatTime(timer)}</span>
            </div>
            <button 
                onClick={resetLevel}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Reset Level"
            >
                <RefreshCw size={20} />
            </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Problem & Source */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-0 overflow-y-auto">
            {/* Problem Desc */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">
                        Goal: {currentScenario.title}
                    </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {currentScenario.description}
                </p>
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r text-xs text-amber-800 italic">
                    <span className="font-bold not-italic">Hint:</span> {currentScenario.hint}
                </div>
            </div>

            {/* Attribute Pool */}
            <div className="p-4 flex-1 bg-slate-50">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Available Attributes</h3>
                <div className="flex flex-wrap content-start">
                    {pool.map((attr) => (
                        <DraggableAttribute key={attr.instanceId || attr.id} attribute={attr} isSource={true} />
                    ))}
                    {pool.length === 0 && (
                        <div className="text-center w-full py-8 text-slate-400 text-sm italic">
                            All attributes placed.
                        </div>
                    )}
                </div>
                <p className="mt-4 text-[10px] text-center text-slate-400">
                    Drag attributes to tables.<br/>Click ★ for Primary Key.<br/>Click 🔗 for Foreign Key.
                </p>
            </div>
        </aside>

        {/* Right Area: Canvas */}
        <div className="flex-1 bg-slate-100 relative overflow-auto p-8">
            <div className="flex flex-wrap gap-6 items-start pb-32">
                {tables.map(table => (
                    <TableNode 
                        key={table.id}
                        table={table}
                        onDrop={handleDropAttribute}
                        onRemoveAttr={removeAttrFromTable}
                        onTogglePK={togglePK}
                        onToggleFK={toggleFK}
                        onDeleteTable={deleteTable}
                    />
                ))}

                {/* Add Table Button */}
                <button 
                    onClick={addTable}
                    className="flex flex-col items-center justify-center w-64 h-32 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-white transition-all"
                >
                    <Plus size={32} className="mb-2" />
                    <span className="font-medium">New Table</span>
                </button>
            </div>

            {/* Floating Action Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-xl border border-slate-200">
                 <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md">
                    {tables.length}
                 </div>
                 <span className="text-sm font-medium text-slate-600 mr-2">Tables Created</span>
                 <button 
                    onClick={validateSolution}
                    className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2 shadow-lg"
                 >
                    Check Schema <CheckCircle size={16} />
                 </button>
            </div>
        </div>
      </main>

      {/* Feedback Modal / Overlay */}
      {feedback && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200`}>
                <div className={`p-6 ${feedback.type === 'success' ? 'bg-green-50' : feedback.type === 'complete' ? 'bg-indigo-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        {feedback.type === 'success' || feedback.type === 'complete' ? (
                            <CheckCircle className={feedback.type === 'success' ? "text-green-600" : "text-indigo-600"} size={28} />
                        ) : (
                            <AlertCircle className="text-red-600" size={28} />
                        )}
                        <h2 className={`text-xl font-bold ${feedback.type === 'success' ? 'text-green-800' : feedback.type === 'complete' ? 'text-indigo-800' : 'text-red-800'}`}>
                            {feedback.message}
                        </h2>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-slate-600 mb-6 whitespace-pre-line">{feedback.detail}</p>
                    
                    <div className="flex justify-end gap-3">
                        {feedback.type === 'error' ? (
                            <button 
                                onClick={() => setFeedback(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        ) : feedback.type === 'complete' ? (
                             <button 
                                onClick={() => { setFeedback(null); setShowIntro(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                Back to Menu
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setFeedback(null); nextLevel(); }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                Next Level <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
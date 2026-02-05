import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, where, serverTimestamp, setDoc, getDoc 
} from 'firebase/firestore';
import { 
  BookOpen, Users, Settings, Plus, X, Trash2, CheckCircle, 
  Play, Pause, StopCircle, Home, HelpCircle, AlertCircle, ThumbsUp 
} from 'lucide-react';

// --- 👇 道子さん専用の鍵をセット済みです！ ---
const firebaseConfig = {
  apiKey: "AIzaSyBDGr0xxFr0c9G43DXDRz1PzDXZXVDc6bo",
  authDomain: "petasta-app.firebaseapp.com",
  projectId: "petasta-app",
  storageBucket: "petasta-app.firebasestorage.app",
  messagingSenderId: "262266290618",
  appId: "1:262266290618:web:af18aa8ded4aaa6369dd83"
};
// ----------------------------------------------------

// Firebase初期化
let app;
let db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase接続エラー", error);
}

const DEFAULT_CATEGORIES = ['国語', '算数', '理科', '社会', '英語'];

export default function App() {
  const [user, setUser] = useState(null);

  // 通知許可リクエスト
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <MainApp user={user} onLogout={() => setUser(null)} />;
}

// --- 1. ログイン画面 ---
function LoginScreen({ onLogin }) {
  const [secret, setSecret] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    onLogin({ familyId: secret.trim() });
  };

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
        <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="text-teal-600" size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-700 mb-2">ペタスタへようこそ</h1>
        <p className="text-sm text-gray-500 mb-6">家族の合言葉を入れてね</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="例：sato"
            className="w-full border bg-gray-50 rounded-lg p-3 text-center font-bold outline-none focus:ring-2 focus:ring-teal-200"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <button type="submit" className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl hover:bg-teal-600 transition-colors">
            スタート！
          </button>
        </form>
      </div>
    </div>
  );
}

// --- 2. メインアプリ ---
function MainApp({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [mode, setMode] = useState('child'); 
  const [tab, setTab] = useState('list'); 
  const [activeTask, setActiveTask] = useState(null); 

  // データ読み込み
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "tasks"), 
      where("familyId", "==", user.familyId)
    );
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedTasks.sort((a, b) => (a.date > b.date ? 1 : -1));
      setTasks(fetchedTasks);
    });

    const settingsRef = doc(db, "settings", user.familyId);
    getDoc(settingsRef).then((snap) => {
      if (snap.exists() && snap.data().categories) {
        setCategories(snap.data().categories);
      }
    });

    return () => unsubscribeTasks();
  }, [user.familyId]);

  // アクション
  const saveCategories = async (newCats) => {
    setCategories(newCats);
    if (!db) return;
    await setDoc(doc(db, "settings", user.familyId), { categories: newCats }, { merge: true });
  };

  const addTask = async (newTask) => {
    if (!db) return;
    await addDoc(collection(db, "tasks"), {
      ...newTask,
      familyId: user.familyId,
      status: 'todo',
      duration: 0,
      createdAt: serverTimestamp()
    });
    setTab('list');
  };

  const completeTask = async (taskId, duration) => {
    if (!db) return;
    await updateDoc(doc(db, "tasks", taskId), { 
      status: 'done',
      duration: duration 
    });
    setActiveTask(null);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("よくがんばりました！💮", { body: "タスクが完了しました！" });
    }
  };

  const suspendTask = async (taskId, duration) => {
    if (!db) return;
    await updateDoc(doc(db, "tasks", taskId), { duration: duration });
    setActiveTask(null);
  };

  // SOSアクション
  const helpTask = async (taskId, duration) => {
    if (!db) return;
    await updateDoc(doc(db, "tasks", taskId), { 
      status: 'help', 
      duration: duration 
    });
    setActiveTask(null);
  };

  // 【新機能】SOS解決アクション（通常状態に戻す）
  const resolveTask = async (e, taskId) => {
    e.stopPropagation(); // タイマーが開かないようにする
    if (!db) return;
    await updateDoc(doc(db, "tasks", taskId), { 
      status: 'todo' // ステータスを「todo」に戻す
    });
  };

  const deleteTask = async (taskId) => {
    if (!db) return;
    if (window.confirm('本当に消しますか？')) {
      await deleteDoc(doc(db, "tasks", taskId));
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(t => t.date === todayStr);
  const doneCount = todaysTasks.filter(t => t.status === 'done').length;
  const progress = todaysTasks.length > 0 ? Math.round((doneCount / todaysTasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700 pb-20 relative">
      
      {activeTask && (
        <TimerOverlay 
          task={activeTask} 
          onFinish={completeTask} 
          onSuspend={suspendTask}
          onHelp={helpTask} 
        />
      )}

      {/* ヘッダー */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-teal-600 flex items-center gap-2">
            <BookOpen size={24} />
            Study Buddy
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setMode(mode === 'child' ? 'parent' : 'child')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1
                ${mode === 'parent' ? 'bg-indigo-600 text-white' : 'bg-teal-100 text-teal-700'}`}
            >
              <Users size={14} />
              {mode === 'parent' ? '保護者' : 'キッズ'}
            </button>
            <button onClick={onLogout} className="text-gray-400"><X size={20}/></button>
          </div>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-md mx-auto p-4">

        {mode === 'child' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 text-center">
            <h2 className="text-sm font-bold text-gray-400 mb-2">今日のゴール</h2>
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="60" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle cx="64" cy="64" r="60" stroke="#14b8a6" strokeWidth="12" fill="none"
                  strokeDasharray="377" strokeDashoffset={377 - (377 * progress) / 100}
                  strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute text-3xl font-bold text-teal-600">{progress}%</div>
            </div>
            <p className="mt-2 text-sm text-gray-500">{doneCount} / {todaysTasks.length} タスク完了</p>
          </div>
        )}

        {mode === 'parent' && (
          <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm">
            <button onClick={() => setTab('list')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab === 'list' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>リスト</button>
            <button onClick={() => setTab('add')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab === 'add' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>追加</button>
            <button onClick={() => setTab('settings')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab === 'settings' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>設定</button>
          </div>
        )}

        {tab === 'add' ? (
          <AddTaskScreen categories={categories} onAdd={addTask} onCancel={() => setTab('list')} />
        ) : tab === 'settings' ? (
          <SettingsScreen categories={categories} onSave={saveCategories} />
        ) : (
          /* タスクリスト */
          <div className="space-y-3">
            {tasks.length === 0 && <div className="text-center py-10 text-gray-400">タスクがありません🌱</div>}
            
            {tasks.map(task => (
              <div key={task.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex items-center gap-3 transition-all
                ${task.status === 'done' ? 'border-gray-300 opacity-60' : 
                  task.status === 'help' ? 'border-red-500 bg-red-50' : 'border-teal-500'}`}>
                
                {/* 左側情報 */}
                <div className="flex-1">
                  <div className="text-xs text-gray-400 flex gap-2 mb-1">
                     <span className="bg-gray-100 px-2 py-0.5 rounded">{task.category}</span>
                     <span>{task.date === todayStr ? '今日' : task.date}</span>
                  </div>
                  <h3 className={`font-bold text-lg ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                  </h3>
                  
                  {/* SOS表示と解決ボタン */}
                  {task.status === 'help' && (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-red-500 font-bold text-xs flex items-center gap-1 animate-pulse">
                        <AlertCircle size={14}/> SOS!
                      </div>
                      <button 
                        onClick={(e) => resolveTask(e, task.id)}
                        className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-teal-200"
                      >
                        <ThumbsUp size={12}/> 解決したよ
                      </button>
                    </div>
                  )}

                  {(task.duration > 0 || task.status === 'done') && task.status !== 'help' && (
                     <span className={`text-xs font-bold flex items-center gap-1 mt-1 
                       ${task.status === 'done' ? 'text-teal-600' : 'text-orange-400'}`}>
                       ⏱ {Math.floor(task.duration/60)}分 
                       {task.status !== 'done' && ' (途中)'}
                     </span>
                  )}
                </div>

                {/* 右側ボタン */}
                <div className="flex-shrink-0">
                  {task.status === 'done' ? (
                     <div className="text-teal-500 flex flex-col items-center">
                       <CheckCircle size={24} />
                       <span className="text-[10px] font-bold">完了</span>
                     </div>
                  ) : (
                     <button 
                       onClick={() => setActiveTask(task)}
                       className={`${task.status === 'help' ? 'bg-red-500' : task.duration > 0 ? 'bg-orange-400' : 'bg-teal-500'} hover:opacity-90 text-white px-4 py-2 rounded-full font-bold shadow-md active:scale-95 transition-all flex items-center gap-1`}
                     >
                       <Play size={16} fill="currentColor" />
                       <span className="text-sm">
                         {task.status === 'help' ? '再開' : task.duration > 0 ? '再開' : 'スタート'}
                       </span>
                     </button>
                  )}
                </div>

                {mode === 'parent' && (
                  <button onClick={() => deleteTask(task.id)} className="text-red-300 hover:text-red-500 ml-2"><Trash2 size={18} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// --- 3. ストップウォッチ画面（SOS付き） ---
function TimerOverlay({ task, onFinish, onSuspend, onHelp }) {
  const [seconds, setSeconds] = useState(task.duration || 0);
  const [isActive, setIsActive] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && !isFinishing) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isFinishing]);

  const handleFinish = () => {
    setIsActive(false);
    setIsFinishing(true);
    setTimeout(() => {
      onFinish(task.id, seconds);
    }, 1500);
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isFinishing) {
    return (
      <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <div className="text-9xl animate-bounce">💮</div>
        <h2 className="text-3xl font-bold text-red-500 mt-4 animate-pulse">よくできました！</h2>
        <p className="text-gray-500 mt-2">ママに通知しました✨</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-teal-600 z-50 flex flex-col items-center justify-center text-white p-6">
      <div className="text-teal-200 text-lg mb-2">{task.category}</div>
      <h2 className="text-2xl font-bold mb-8 text-center">{task.title}</h2>
      
      <div className="text-8xl font-mono font-bold mb-12 tracking-wider">
        {formatTime(seconds)}
      </div>

      <div className="grid grid-cols-4 gap-3 w-full max-w-sm mb-6">
        {/* SOSボタン */}
        <button 
          onClick={() => onHelp(task.id, seconds)}
          className="col-span-1 bg-red-400 hover:bg-red-500 text-white py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-md"
        >
          <HelpCircle size={24}/>
          <span className="text-[10px]">SOS!</span>
        </button>

        {/* 中断ボタン */}
        <button 
          onClick={() => onSuspend(task.id, seconds)}
          className="col-span-1 bg-white/20 hover:bg-white/30 text-white py-4 rounded-2xl font-bold flex flex-col items-center gap-1"
        >
          <Home size={24}/>
          <span className="text-[10px]">戻る</span>
        </button>

        {/* 一時停止/再開 */}
        <button 
          onClick={() => setIsActive(!isActive)}
          className="col-span-1 bg-white/20 hover:bg-white/30 text-white py-4 rounded-2xl font-bold flex flex-col items-center gap-1"
        >
          {isActive ? <Pause size={24}/> : <Play size={24}/>}
          <span className="text-[10px]">{isActive ? '停止' : '再開'}</span>
        </button>
        
        {/* 完了ボタン */}
        <button 
          onClick={handleFinish}
          className="col-span-1 bg-white text-teal-600 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-lg hover:scale-105 transition-transform"
        >
          <StopCircle size={24} />
          <span className="text-[10px]">おわり</span>
        </button>
      </div>
      
      {task.duration > 0 && (
         <div className="text-teal-200 text-sm">
           (これまでの {Math.floor(task.duration/60)}分 も含まれています)
         </div>
      )}
    </div>
  );
}

function AddTaskScreen({ categories, onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', category: categories[0], date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    onAdd(form);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Plus className="text-teal-500" /> 新しいタスク
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">やること</label>
          <input 
            className="w-full border bg-gray-50 rounded-lg p-3 outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="例：漢字ドリル P3"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">科目</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({...form, category: cat})}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                  form.category === cat ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">日付</label>
          <input 
            type="date"
            className="w-full border bg-gray-50 rounded-lg p-3 outline-none"
            value={form.date}
            onChange={e => setForm({...form, date: e.target.value})}
          />
        </div>
        <div className="pt-2 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">やめる</button>
          <button type="submit" className="flex-1 bg-teal-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-teal-600 transition-colors">追加する</button>
        </div>
      </form>
    </div>
  );
}

function SettingsScreen({ categories, onSave }) {
  const [newCat, setNewCat] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) return;
    onSave([...categories, newCat.trim()]);
    setNewCat('');
  };

  const handleDelete = (target) => {
    if (confirm(`${target} を削除しますか？`)) {
      onSave(categories.filter(c => c !== target));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Settings className="text-gray-500" /> 科目の設定
      </h2>
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-500 mb-2">今の科目リスト</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat} className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
              {cat}
              <button onClick={() => handleDelete(cat)} className="text-teal-300 hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={handleAdd} className="border-t pt-4">
        <label className="block text-xs font-bold text-gray-500 mb-2">新しい科目を追加</label>
        <div className="flex gap-2">
          <input className="flex-1 border bg-gray-50 rounded-lg p-3 outline-none focus:ring-2 focus:ring-teal-200" placeholder="例：ピアノ" value={newCat} onChange={e => setNewCat(e.target.value)}/>
          <button type="submit" className="bg-teal-500 text-white px-4 rounded-lg font-bold hover:bg-teal-600">追加</button>
        </div>
      </form>
    </div>
  );
}
import React, { useEffect, useState, useRef } from 'react';
import './App.css'; // You'll need to create this CSS file
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Tab } from '@headlessui/react'; // Using Headless UI for tabs
import { supabase } from './utils/supabase'; // Assuming you have this configured
import { FaMosque, FaHandHoldingHeart } from 'react-icons/fa';
import { IoWater, IoCall, IoAdd, IoClose, IoSend } from 'react-icons/io5';
import Lottie from 'react-lottie'; // For animations
import './App.css';

const MAIN_COLOR = '#C79C44';
const SECONDARY_COLOR = '#947332';

// Shimmer effect component
const ShimmerPlaceholder = ({ style }) => {
  return (
    <div className="shimmer" style={style}></div>
  );
};

// Empty state component
const EmptyStateIllustration = ({ category }) => {
  const illustrations = {
    mosques: require('./assets/empty-mosque.json'),
    blood: require('./assets/empty-blood.json'),
    post: require('./assets/empty-post.json'),
  };

  const messages = {
    mosques: "لا تتوفر تبرعات للمساجد حتى الآن",
    blood: "لا توجد طلبات للتبرع بالدم حتى الآن",
    post: "لا توجد مشاركات عامة متاحة حتى الآن"
  };

  const lottieOptions = {
    loop: true,
    autoplay: true,
    animationData: illustrations[category],
  };

  return (
    <div className="empty-container">
      <Lottie options={lottieOptions} height={200} width={200} />
      <p className="empty-text">{messages[category]}</p>
      <p className="empty-sub-text">كن أول من ينشر!</p>
    </div>
  );
};

// Fetch donations function
const fetchDonations = async (category) => {
  try {
    const { data, error } = await supabase
      .from('donation')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching donations:', error);
    return [];
  }
};

// Post donation function
const postDonation = async (donationData) => {
  try {
    const { data, error } = await supabase
      .from('donation')
      .insert([donationData]);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error posting donation:', error);
    return { success: false, error };
  }
};

// List Screen Component
const ListScreen = ({ category }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const startY = useRef(0);

  // Fetch data function
  const loadData = async () => {
    setLoading(true);
    const donations = await fetchDonations(category);
    setData(donations);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('public:donation')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'donation',
        filter: `category=eq.${category}`
      }, (payload) => {
        setData(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [category]);

  // Pull-to-refresh logic
  const handlePullStart = (e) => {
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    if (containerRef.current.scrollTop === 0) {
      startY.current = clientY;
    }
  };

  const handlePullMove = (e) => {
    if (startY.current === 0 || containerRef.current.scrollTop > 0) return;

    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const distance = clientY - startY.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 100)); // Dampen the pull effect
      e.preventDefault(); // Prevent default scrolling during pull
    }
  };

  const handlePullEnd = async () => {
    if (pullDistance > 70) { // Threshold to trigger refresh
      setRefreshing(true);
      await loadData();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = 0;
  };

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ar });
    } catch (e) {
      return 'مؤخرًا';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'mosques': return <FaMosque color="#9E3345" />;
      case 'blood': return <IoWater color="#D32F2F" />;
      default: return <FaHandHoldingHeart color="#009CF0" />;
    }
  };

  if (loading) {
    return (
      <div className="container">
        {Array(5).fill().map((_, i) => (
          <div key={i} className="card">
            <div className="shimmer" style={{ height: '24px', width: '70%', marginBottom: '10px' }} />
            <div className="shimmer" style={{ height: '16px', width: '90%', marginBottom: '10px' }} />
            <div className="shimmer" style={{ height: '20px', width: '40%', marginBottom: '8px' }} />
            {category !== 'blood' && <div className="shimmer" style={{ height: '20px', width: '50%' }} />}
          </div>
        ))}
      </div>
    );
  }

  const lottieOptions = {
    loop: true,
    autoplay: true,
  };

  if (loading) {
    return (
      <div className="container">
        {Array(5).fill().map((_, i) => (
          <div key={i} className="card">
            <ShimmerPlaceholder style={{ height: '24px', width: '70%', marginBottom: '10px' }} />
            <ShimmerPlaceholder style={{ height: '16px', width: '90%', marginBottom: '10px' }} />
            <ShimmerPlaceholder style={{ height: '20px', width: '40%', marginBottom: '8px' }} />
            {category !== 'blood' && <ShimmerPlaceholder style={{ height: '20px', width: '50%' }} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className="container"
      ref={containerRef}
      onMouseDown={handlePullStart}
      onMouseMove={handlePullMove}
      onMouseUp={handlePullEnd}
      onMouseLeave={handlePullEnd}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      style={{ overflowY: 'auto', maxHeight: '80vh', position: 'relative' }}
    >
      <div 
        className={`refresh-control ${refreshing ? 'refreshing' : ''}`}
        style={{ 
          transform: `translateY(${pullDistance - 60}px)`, 
          opacity: pullDistance > 0 ? 1 : 0,
          transition: refreshing ? 'none' : 'transform 0.2s, opacity 0.2s',
        }}
      >
        {refreshing ? (
          <span></span> /* Spinning circle when refreshing */
        ) : (
          <span style={{ transform: `rotate(${pullDistance * 2}deg)` }}></span> /* Rotates while pulling */
        )}
      </div>
      {data.length === 0 ? (
        <EmptyStateIllustration category={category} />
      ) : (
        <div className="list-content">
          {data.map((item, index) => (
            <div key={index} className="card">
              <div className="card-header">
                <div className="category-tag">
                  {getCategoryIcon()}
                  <span className="category-text">{category === 'mosques' ? 'المساجد' : category === 'blood' ? 'التبرع بالدم' : 'منشور'}</span>
                </div>
                <span className="time-ago">{formatDate(item.created_at)}</span>
              </div>
              <h3 className="title">{item.title}</h3>
              <p className="description">{item.description}</p>
              <div className="card-footer">
                <button className="phone-button">
                  <IoCall color="#fff" />
                  <span>{item.phone}</span>
                </button>
                {item.rip && (
                  <div className="rip-container">
                    <span className="rip">{item.rip}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// New Post Modal Component
const NewPostModal = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [rip, setRip] = useState('');
  const [category, setCategory] = useState('mosques');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'العنوان مطلوب';
    if (!description.trim()) newErrors.description = 'الوصف مطلوب';
    if (!phone.trim()) newErrors.phone = 'رقم الهاتف مطلوب';
    if (category === 'mosques' && !rip.trim()) newErrors.rip = 'رقم CCP مطلوب للتبرع للمساجد';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const postData = { title, description, phone, rip: rip || null, category };
    const result = await postDonation(postData);
    setLoading(false);
    
    if (result.success) {
      setTitle(''); setDescription(''); setPhone(''); setRip(''); setCategory('post');
      onClose();
    } else {
      alert('فشل إرسال المنشور. يرجى المحاولة مرة أخرى.');
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-container">
      <div className="modal-content">
        <div className="modal-header">
          <h2>منشور جديد للتبرع</h2>
          <button onClick={onClose} className="close-button"><IoClose size={24} /></button>
        </div>
        <div className="form-container">
          <label>الفئة</label>
          <div className="category-buttons">
            {['mosques', 'blood', 'post'].map(cat => (
              <button
                key={cat}
                className={`category-button ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat === 'mosques' ? 'المساجد' : cat === 'blood' ? 'التبرع بالدم' : 'منشور'}
              </button>
            ))}
          </div>
          <label>عنوان</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل عنوانًا أو اسمًا" />
          {errors.title && <span className="error-text">{errors.title}</span>}
          <label>الوصف</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="أدخل الوصف" />
          {errors.description && <span className="error-text">{errors.description}</span>}
          <label>رقم الهاتف</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="أدخل رقم الهاتف" />
          {errors.phone && <span className="error-text">{errors.phone}</span>}
          {category === 'mosques' && (
            <>
              <label>CCP Algerie Poste (Required)</label>
              <input type="number" value={rip} onChange={e => setRip(e.target.value)} placeholder="أدخل رقم CCP" />
              {errors.rip && <span className="error-text">{errors.rip}</span>}
            </>
          )}
        </div>
        <button className="submit-button" onClick={handleSubmit} disabled={loading}>
          {loading ? 'جاري النشر...' : <><IoSend /> <span>نشر</span></>}
        </button>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <img src="./Sada9at2.png" alt="Logo" className="logo" />
        <h1>Sada9at - صدقات</h1>
      </header>
      <Tab.Group>
        <Tab.List className="tab-bar">
          <Tab className={({ selected }) => `tab ${selected ? 'active' : ''}`}>
            <FaMosque  style={{ fontSize: '15px'}}/> المساجد
          </Tab>
          <Tab className={({ selected }) => `tab ${selected ? 'active' : ''}`}>
            <IoWater style={{ fontSize: '15px'}} /> التبرع بالدم
          </Tab>
          <Tab className={({ selected }) => `tab ${selected ? 'active' : ''}`}>
            <FaHandHoldingHeart style={{ fontSize: '15px'}} /> المنشورات العامة
          </Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel><ListScreen category="mosques" /></Tab.Panel>
          <Tab.Panel><ListScreen category="blood" /></Tab.Panel>
          <Tab.Panel><ListScreen category="post" /></Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      <button className="fab" onClick={() => setModalVisible(true)}>
        <IoAdd size={30} />
      </button>
      <NewPostModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </div>
  );
}

export default App;
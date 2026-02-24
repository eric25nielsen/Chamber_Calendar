import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, Download, Settings, MapPin, Clock, Users, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const ChamberCalendarApp = () => {
  const [chambers, setChambers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState('calendar');
  const [showAddChamber, setShowAddChamber] = useState(false);
  const [newChamber, setNewChamber] = useState({ name: '', location: '', website: '', enabled: true });
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    type: 'networking',
    chamberId: '',
    recurring: 'none',
    occurrences: 1,
    endDate: ''
  });

  const chamberRssMap = {
    '1': 'https://business.fortworthchamber.com/feed/rss/UpcomingEvents.rss',
    '3': 'https://business.grapevinechamber.org/feed/rss/UpcomingEvents.rss',
    '5': 'https://business.dentonchamber.org/feed/rss/UpcomingEvents.rss',
    '6': 'https://business.kellerchamber.com/feed/rss/UpcomingEvents.rss',
    '8': 'https://business.heb.org/feed/rss/UpcomingEvents.rss',
    '9': 'https://business.colleyvillechamber.org/feed/rss/UpcomingEvents.rss',
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const loadData = async (fetchReal = false) => {
    setLoading(true);
    try {
      const chambersResult = localStorage.getItem('chambers');
      if (chambersResult) {
        setChambers(JSON.parse(chambersResult));
      } else {
        const sampleChambers = [
          { id: '1', name: 'Fort Worth Chamber of Commerce', location: 'Fort Worth, TX', website: 'https://fortworthchamber.com', enabled: true },
          { id: '2', name: 'Greater Arlington Chamber of Commerce', location: 'Arlington, TX', website: 'https://www.arlingtontx.com', enabled: true },
          { id: '3', name: 'Grapevine Chamber of Commerce', location: 'Grapevine, TX', website: 'https://www.grapevinechamber.org', enabled: true },
          { id: '4', name: 'Southlake Chamber of Commerce', location: 'Southlake, TX', website: 'https://www.southlakechamber.org', enabled: true },
          { id: '5', name: 'Denton Chamber of Commerce', location: 'Denton, TX', website: 'https://dentonchamber.org', enabled: true },
          { id: '6', name: 'Greater Keller Chamber', location: 'Keller, TX', website: 'https://www.kellerchamber.com', enabled: true },
          { id: '7', name: 'Weatherford Chamber of Commerce', location: 'Weatherford, TX', website: 'https://www.weatherford-chamber.com', enabled: true },
          { id: '8', name: 'Hurst-Euless-Bedford (HEB) Chamber of Commerce', location: 'Bedford, TX', website: 'https://heb.org', enabled: true },
          { id: '9', name: 'Colleyville Chamber of Commerce', location: 'Colleyville, TX', website: 'https://colleyvillechamber.org', enabled: true },
          { id: '10', name: 'Northeast Tarrant Chamber of Commerce', location: 'Haltom City, TX', website: 'https://www.netarrant.org', enabled: true }
        ];
        setChambers(sampleChambers);
        localStorage.setItem('chambers', JSON.stringify(sampleChambers));
      }

      let loadedEvents = [];
      const eventsResult = localStorage.getItem('events');
      if (eventsResult) {
        loadedEvents = JSON.parse(eventsResult).map(e => ({ ...e, date: new Date(e.date) }));
      } else {
        loadedEvents = generateSampleEvents();
      }

      if (fetchReal) {
        const realEvents = await fetchRealEvents();
        const existingIds = new Set(loadedEvents.map(e => e.id));
        const newReal = realEvents.filter(e => !existingIds.has(e.id));
        loadedEvents = [...loadedEvents, ...newReal];
      }

      const recurring = generateRecurringFridays();
      const existingIds = new Set(loadedEvents.map(e => e.id));
      const newRecurring = recurring.filter(e => !existingIds.has(e.id));
      loadedEvents = [...loadedEvents, ...newRecurring];

      setEvents(loadedEvents);
      localStorage.setItem('events', JSON.stringify(loadedEvents.map(e => ({ ...e, date: e.date.toISOString() }))));
    } catch (error) {
      console.error('Error loading data:', error);
      setEvents(generateSampleEvents());
    } finally {
      setLoading(false);
    }
  };

  const fetchRealEvents = async () => {
    const realEvents = [];
    for (const [id, rssUrl] of Object.entries(chamberRssMap)) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const items = doc.getElementsByTagName('item');
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const title = item.querySelector('title')?.textContent || '';
          const pubDateStr = item.querySelector('pubDate')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const description = item.querySelector('description')?.textContent || '';

          const date = new Date(pubDateStr);
          if (isNaN(date.getTime())) continue;

          const locationMatch = description.match(/Location:\s*(.+?)(?:\n|$)/i) || description.match(/at\s+(.+?)(?:\n|$)/i);
          const location = locationMatch ? locationMatch[1].trim() : 'Location not specified';

          realEvents.push({
            id: `rss-${id}-${Date.now()}-${i}`,
            chamberId: id,
            title,
            date,
            location,
            description: description.replace(/<[^>]+>/g, '').trim(),
            type: title.toLowerCase().includes('workshop') ? 'workshop' :
                  title.toLowerCase().includes('luncheon') ? 'luncheon' :
                  title.toLowerCase().includes('conference') ? 'conference' : 'networking',
            link
          });
        }
      } catch (err) {
        console.error(`Error fetching RSS for chamber ${id}:`, err);
      }
    }
    return realEvents;
  };

  const generateSampleEvents = () => {
    const today = new Date();
    return [
      {
        id: '1',
        chamberId: '1',
        title: 'Business After Hours Networking',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 17, 30),
        location: 'The Modern Art Museum',
        description: 'Join fellow members for networking and refreshments',
        type: 'networking'
      },
      // ... (rest of sample events as before, omitted for brevity)
    ];
  };

  const generateRecurringFridays = () => {
    // ... (as before)
  };

  const addChamber = () => {
    // ... (as before)
  };

  const removeChamber = (id) => {
    // ... (as before)
  };

  const toggleChamber = (id) => {
    // ... (as before)
  };

  const resetToDefaults = () => {
    // ... (as before)
  };

  const exportToICS = () => {
    // ... (as before)
  };

  const addEvent = () => {
    // ... (as before)
  };

  const getDaysInMonth = (date) => {
    // ... (as before)
  };

  const getEventsForDate = (date) => {
    // ... (as before)
  };

  const changeMonth = (delta) => {
    // ... (as before)
  };

  const getEventTypeColor = (type) => {
    // ... (as before)
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', height: '100vh', width: '100vw', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8FAFC', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <Calendar size={48} style={{ animation: 'pulse 2s infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '18px', fontWeight: 500 }}>Loading your calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#F8FAFC',
      margin: 0,
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
        #root { height: 100%; width: 100%; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        .calendar-day { transition: all 0.2s ease; cursor: pointer; }
        .calendar-day:hover { background: rgba(248,250,252,0.1); transform: scale(1.05); }
        .event-dot { width:6px; height:6px; border-radius:50%; display:inline-block; margin:0 2px; }
        .btn { transition: all 0.2s ease; border:none; cursor:pointer; font-family:'Inter',sans-serif; }
        .btn:hover { transform:translateY(-2px); box-shadow:0 8px 16px rgba(0,0,0,0.3); }
        .chamber-card { transition: all 0.2s ease; }
        .chamber-card:hover { transform:translateX(4px); }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              background: 'linear-gradient(135deg, #37b4db 0%, #1a428a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Chamber Calendar
            </h1>
            <p style={{ margin: '8px 0 0', color: '#94A3B8', fontSize: '16px', fontWeight: 500 }}>
              Your local business community events
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setView('calendar')} className="btn" style={{ padding: '12px 24px', background: view === 'calendar' ? 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)' : 'rgba(248,250,252,0.1)', color: '#F8FAFC', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Calendar
            </button>
            <button onClick={() => setView('list')} className="btn" style={{ padding: '12px 24px', background: view === 'list' ? 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)' : 'rgba(248,250,252,0.1)', color: '#F8FAFC', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Events
            </button>
            <button onClick={() => setView('settings')} className="btn" style={{ padding: '12px 24px', background: view === 'settings' ? 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)' : 'rgba(248,250,252,0.1)', color: '#F8FAFC', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Chambers
            </button>
            <button onClick={exportToICS} className="btn" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #37b4db 0%, #1a428a 100%)', color: '#F8FAFC', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} /> Export
            </button>
          </div>
        </div>

        {view === 'calendar' && (
          <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(248,250,252,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <button onClick={() => changeMonth(-1)} className="btn" style={{ background: 'rgba(248,250,252,0.1)', padding: '12px', borderRadius: '12px', color: '#F8FAFC' }}>
                <ChevronLeft size={24} />
              </button>
              <h2 style={{ fontSize: '32px', fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0 }}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => changeMonth(1)} className="btn" style={{ background: 'rgba(248,250,252,0.1)', padding: '12px', borderRadius: '12px', color: '#F8FAFC' }}>
                <ChevronRight size={24} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 600, color: '#37b4db', padding: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
              {getDaysInMonth(selectedDate).map((date, i) => {
                const dayEvents = date ? getEventsForDate(date) : [];
                const isToday = date && date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className="calendar-day"
                    style={{
                      minHeight: '100px',
                      background: date ? isToday ? 'linear-gradient(135deg, rgba(26,66,138,0.2), rgba(55,180,219,0.2))' : 'rgba(248,250,252,0.05)' : 'transparent',
                      borderRadius: '12px',
                      padding: '12px',
                      border: isToday ? '2px solid #37b4db' : '1px solid rgba(248,250,252,0.1)'
                    }}
                    onClick={() => date && setSelectedDay(date)}
                  >
                    {date && (
                      <>
                        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: isToday ? '#37b4db' : '#F8FAFC' }}>
                          {date.getDate()}
                        </div>
                        {dayEvents.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                            {dayEvents.slice(0,3).map(e => (
                              <div
                                key={e.id}
                                className="event-dot"
                                style={{ background: getEventTypeColor(e.type), boxShadow: `0 0 8px ${getEventTypeColor(e.type)}80` }}
                                title={e.title}
                              />
                            ))}
                            {dayEvents.length > 3 && <span style={{ fontSize: '10px', color: '#94A3B8' }}>+{dayEvents.length - 3}</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {events
              .filter(e => chambers.find(c => c.id === e.chamberId)?.enabled)
              .sort((a, b) => a.date - b.date)
              .map((e, index) => {
                const chamber = chambers.find(c => c.id === e.chamberId);
                return (
                  <div
                    key={e.id}
                    style={{
                      background: 'rgba(15,23,42,0.6)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '20px',
                      padding: '24px',
                      border: '1px solid rgba(248,250,252,0.1)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: getEventTypeColor(e.type) }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: `${getEventTypeColor(e.type)}20`,
                          color: getEventTypeColor(e.type),
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          marginBottom: '12px'
                        }}>
                          {e.type}
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px', fontFamily: "'Playfair Display', serif" }}>
                          {e.title}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#94A3B8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} />
                            {e.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} />
                            {e.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={16} />
                            {e.location}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} />
                            {chamber?.name}
                          </div>
                          {e.link && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ExternalLink size={16} />
                              <a href={e.link} target="_blank" rel="noopener noreferrer" style={{ color: '#37b4db', textDecoration: 'none' }}>
                                View details
                              </a>
                            </div>
                          )}
                        </div>
                        <p style={{ marginTop: '16px', color: '#CBD5E1', lineHeight: 1.6 }}>
                          {e.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {view === 'settings' && (
          <div>
            <div style={{
              background: 'rgba(15,23,42,0.6)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid rgba(248,250,252,0.1)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0 }}>
                  Your Chambers
                </h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={resetToDefaults}
                    className="btn"
                    style={{
                      padding: '12px 24px',
                      background: 'rgba(55,180,219,0.2)',
                      color: '#37b4db',
                      border: '1px solid rgba(55,180,219,0.5)',
                      borderRadius: '12px',
                      fontWeight: 600
                    }}
                  >
                    Reset to Defaults
                  </button>
                  <button
                    onClick={() => setShowAddChamber(!showAddChamber)}
                    className="btn"
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)',
                      color: '#F8FAFC',
                      borderRadius: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Plus size={18} /> Add Chamber
                  </button>
                </div>
              </div>

              {showAddChamber && (
                <div style={{
                  background: 'rgba(248,250,252,0.05)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  border: '1px solid rgba(248,250,252,0.1)'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Add New Chamber</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Chamber Name"
                      value={newChamber.name}
                      onChange={e => setNewChamber({ ...newChamber, name: e.target.value })}
                      style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={newChamber.location}
                      onChange={e => setNewChamber({ ...newChamber, location: e.target.value })}
                      style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                    />
                    <input
                      type="text"
                      placeholder="Website URL"
                      value={newChamber.website}
                      onChange={e => setNewChamber({ ...newChamber, website: e.target.value })}
                      style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                    />
                    <button
                      onClick={addChamber}
                      className="btn"
                      style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)', color: '#F8FAFC', borderRadius: '12px', fontWeight: 600 }}
                    >
                      Add Chamber
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: '12px' }}>
                {chambers.map(c => (
                  <div
                    key={c.id}
                    className="chamber-card"
                    style={{
                      background: c.enabled ? 'rgba(248,250,252,0.05)' : 'rgba(248,250,252,0.02)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid rgba(248,250,252,0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: c.enabled ? 1 : 0.6
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>{c.name}</h4>
                      <div style={{ display: 'flex', gap: '16px', color: '#94A3B8', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} />{c.location}
                        </div>
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#37b4db', textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} /> Website
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => toggleChamber(c.id)}
                        className="btn"
                        style={{
                          padding: '8px 16px',
                          background: c.enabled ? 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)' : 'rgba(248,250,252,0.1)',
                          color: '#F8FAFC',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => removeChamber(c.id)}
                        className="btn"
                        style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.2)', color: '#DC2626', borderRadius: '8px' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="btn"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)',
                    color: '#F8FAFC',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '24px'
                  }}
                >
                  <Plus size={18} /> Add Event
                </button>

                <button
                  onClick={() => loadData(true)}
                  className="btn"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #37b4db 0%, #1a428a 100%)',
                    color: '#F8FAFC',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '12px'
                  }}
                >
                  <RefreshCw size={18} /> Refresh Events from Chambers
                </button>
              </>
            </div>

            {showAddEvent && (
              <div style={{
                background: 'rgba(248,250,252,0.05)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid rgba(248,250,252,0.1)',
                marginTop: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Add New Event</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Title"
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={newEvent.location}
                    onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <textarea
                    placeholder="Description"
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC', height: '100px' }}
                  />
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  >
                    <option value="networking">Networking</option>
                    <option value="workshop">Workshop</option>
                    <option value="luncheon">Luncheon</option>
                    <option value="conference">Conference</option>
                    <option value="orientation">Orientation</option>
                  </select>
                  <select
                    value={newEvent.chamberId}
                    onChange={e => setNewEvent({ ...newEvent, chamberId: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  >
                    <option value="">Select Chamber</option>
                    {chambers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={newEvent.recurring}
                    onChange={e => setNewEvent({ ...newEvent, recurring: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  >
                    <option value="none">Singular Event</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Number of Occurrences (for recurring)"
                    value={newEvent.occurrences}
                    onChange={e => setNewEvent({ ...newEvent, occurrences: e.target.value })}
                    min="1"
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <input
                    type="date"
                    placeholder="End Date (optional for recurring)"
                    value={newEvent.endDate}
                    onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    style={{ padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(248,250,252,0.1)', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <button
                    onClick={addEvent}
                    className="btn"
                    style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1a428a 0%, #37b4db 100%)', color: '#F8FAFC', borderRadius: '12px', fontWeight: 600 }}
                  >
                    Add Event
                  </button>
                </div>
              </div>
            )}

            <div style={{
              background: 'rgba(26,66,138,0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(55,180,219,0.3)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={20} /> Calendar Sync Instructions
              </h3>
              <div style={{ color: '#CBD5E1', lineHeight: 1.8 }}>
                <p style={{ margin: '0 0 12px' }}>
                  Click the <strong style={{ color: '#37b4db' }}>Export</strong> button to download your events as an ICS file, which you can import into:
                </p>
                <ul style={{ margin: '8px 0', paddingLeft: '24px' }}>
                  <li style={{ marginBottom: '8px' }}><strong>Google Calendar:</strong> Settings → Import & Export → Import</li>
                  <li style={{ marginBottom: '8px' }}><strong>Microsoft Outlook:</strong> File → Open & Export → Import/Export → Import an iCalendar file</li>
                  <li style={{ marginBottom: '8px' }}><strong>Apple Calendar:</strong> File → Import → Select the .ics file</li>
                </ul>
                <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#94A3B8' }}>
                  Note: This exports a snapshot of current events. The "Refresh Events from Chambers" button pulls the latest from available RSS feeds (Fort Worth, Grapevine, Denton, Keller, HEB, Colleyville). Not all chambers have public RSS.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChamberCalendarApp;

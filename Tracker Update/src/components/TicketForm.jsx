import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

function TicketForm({ tickets, setTickets, selectedDate }) {
  const [ticket, setTicket] = useState('');
  const [link, setLink] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [category, setCategory] = useState('Production');

  const handleAdd = async () => {
    if (!ticket || !estimate || !category) {
      alert('Please fill out Ticket #, Estimate, and Category.');
      return;
    }

    console.log('🎫 CREATING NEW TICKET:', {
      ticket,
      link,
      estimate,
      category,
      selectedDate,
      willBeInLobby: true,
    });

    // ✅ FIXED: Include original_estimate
    const newTicketData = {
      ticket,
      link: link || '', // Ensure link is never null
      estimate,
      original_estimate: estimate, // ✅ ADD this required field
      assigned_user: null,
      start_index: null,
      type: 'normal',
      category,
      date: null, // Null date keeps tickets in persistent lobby
      is_turnover: false, // ✅ EXPLICITLY set to false for fresh tickets
      color_key: ticket, // Use ticket name as color key for fresh tickets
    };

    console.log('📝 New ticket data being inserted:', newTicketData);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([newTicketData])
        .select();

      if (error) {
        console.error('❌ Error inserting ticket:', error.message);
        alert(`Failed to create ticket: ${error.message}`);
      } else {
        console.log('✅ Ticket added to persistent lobby:', data);
        setTicket('');
        setLink('');
        setEstimate(1);

        // Fetch tickets for current date AND null date (lobby)
        const { data: updated, error: fetchError } = await supabase
          .from('tickets')
          .select('*')
          .or(`date.eq.${selectedDate},date.is.null`);
        if (!fetchError) {
          console.log('🔄 Updated tickets state after insert:', {
            totalTickets: updated.length,
            lobbyTickets: updated.filter(
              (t) => !t.assigned_user && t.date === null
            ).length,
            newTicketInResults: updated.find(
              (t) => t.ticket === newTicketData.ticket
            ),
          });
          setTickets(updated);
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleAdd:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  };

 const handleAddSpecial = async (label) => {
  console.log('🟣 Adding special ticket to persistent lobby:', label);

  // ✅ NEW: Check if this special ticket already exists
  const existingSpecial = tickets.find(
    t => t.ticket === label && 
         t.type === 'break' && 
         !t.assigned_user && 
         t.date === null
  );
  
  if (existingSpecial) {
    alert(`A "${label}" ticket already exists in the lobby.`);
    return;
  }

    // ✅ FIXED: Include original_estimate for special tickets too
    const specialTicketData = {
      ticket: label,
      link: '', // Ensure link is not null
      estimate: 0.5,
      original_estimate: 0.5, // ✅ ADD this required field
      type: 'break',
      assigned_user: null,
      start_index: null,
      date: null, // Null date keeps tickets in persistent lobby
      is_turnover: false, // ✅ EXPLICITLY set to false
      color_key: label,
      category: 'Special', // Add category for special tickets
    };

    console.log('📝 Special ticket data being inserted:', specialTicketData);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([specialTicketData])
        .select();

      if (error) {
        console.error('❌ Error inserting special ticket:', error.message);
        alert(`Failed to create special ticket: ${error.message}`);
      } else {
        console.log('✅ Special ticket added to persistent lobby:', data);

        // Fetch tickets for current date AND null date (lobby)
        const { data: updated, error: fetchError } = await supabase
          .from('tickets')
          .select('*')
          .or(`date.eq.${selectedDate},date.is.null`);
        if (!fetchError) {
          setTickets(updated);
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleAddSpecial:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  };

  useEffect(() => {
    const listener = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [ticket, link, estimate, category, selectedDate]);

  return (
    <div className="ticket-entry">
      <input
        type="text"
        placeholder="Ticket #"
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
      />
      <input
        type="text"
        placeholder="Link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <input
        type="number"
        min="0.5"
        step="0.5"
        value={estimate}
        onChange={(e) => setEstimate(parseFloat(e.target.value) || 0)}
        required
      />

      {/* ✅ Three separate category buttons */}
      <div className="category-buttons">
        <button
          className={`category-btn production ${
            category === 'Production' ? 'active' : ''
          }`}
          onClick={() => setCategory('Production')}
        >
          Production
        </button>
        <button
          className={`category-btn design ${
            category === 'Design' ? 'active' : ''
          }`}
          onClick={() => setCategory('Design')}
        >
          Design
        </button>
        <button
          className={`category-btn sp ${category === 'SP' ? 'active' : ''}`}
          onClick={() => setCategory('SP')}
        >
          SP
        </button>
      </div>

      <button onClick={handleAdd}>Add Ticket</button>

      <div className="dropdown">
        <button className="dropbtn">Add Special</button>
        <div className="dropdown-content">
          <div onClick={() => handleAddSpecial('Break')}>Break</div>
          <div onClick={() => handleAddSpecial('Meeting')}>Meeting</div>
          <div onClick={() => handleAddSpecial('Training')}>Training</div>
        </div>
      </div>
    </div>
  );
}

export default TicketForm;


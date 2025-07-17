import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';

export default function Task({ player }) {
  const [task, setTask] = useState(null);
  const numberToWatch = player === 'player1' ? 1 : 2;

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  };

  const contentStyle = {
    fontSize: '3rem',
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  };

  useEffect(() => {
    const fetchTask = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('number', numberToWatch)
        .single();

      if (error) {
        console.error('Failed to fetch task', error.message);
      } else {
        setTask(data);
      }
    };
    fetchTask();
	
	const channel = supabase
	.channel('task-updates')
	.on(
		'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'tasks',
				match: { number: numberToWatch },
			},
			(payload) => {
				const newData = payload.new
				setTask(newData);
			}
		)
		.subscribe()
	
		return () => {
            supabase.removeChannel(channel)
        }
  }, [numberToWatch]);

  if (!task) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <p>TASK : {task.name}</p>
      </div>
    </div>
	)
}
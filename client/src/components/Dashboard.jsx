import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [users, setUsers] = useState([]);
  const [newSong, setNewSong] = useState({ title: '', artist: '', key_signature: '', lyrics: '' });
  const [newSetlist, setNewSetlist] = useState({ name: '', date: '', songIds: [] });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const profileRes = await axios.get('/api/profile');
        setUser(profileRes.data);

        const songsRes = await axios.get('/api/songs');
        setSongs(songsRes.data);

        const setlistsRes = await axios.get('/api/setlists');
        setSetlists(setlistsRes.data);

        if (profileRes.data.role === 'admin') {
          const usersRes = await axios.get('/api/users');
          setUsers(usersRes.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch data');
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };
    fetchData();
  }, [navigate]);

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/songs', newSong);
      const songsRes = await axios.get('/api/songs');
      setSongs(songsRes.data);
      setNewSong({ title: '', artist: '', key_signature: '', lyrics: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create song');
    }
  };

  const handleSongUpdate = async (id, updatedSong) => {
    try {
      await axios.put(`/api/songs/${id}`, updatedSong);
      const songsRes = await axios.get('/api/songs');
      setSongs(songsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update song');
    }
  };

  const handleSongDelete = async (id) => {
    try {
      await axios.delete(`/api/songs/${id}`);
      const songsRes = await axios.get('/api/songs');
      setSongs(songsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete song');
    }
  };

  const handleSetlistSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/setlists', newSetlist);
      const setlistsRes = await axios.get('/api/setlists');
      setSetlists(setlistsRes.data);
      setNewSetlist({ name: '', date: '', songIds: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create setlist');
    }
  };

  const handleSetlistUpdate = async (id, updatedSetlist) => {
    try {
      await axios.put(`/api/setlists/${id}`, updatedSetlist);
      const setlistsRes = await axios.get('/api/setlists');
      setSetlists(setlistsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update setlist');
    }
  };

  const handleSetlistDelete = async (id) => {
    try {
      await axios.delete(`/api/setlists/${id}`);
      const setlistsRes = await axios.get('/api/setlists');
      setSetlists(setlistsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete setlist');
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', newUser);
      const usersRes = await axios.get('/api/users');
      setUsers(usersRes.data);
      setNewUser({ username: '', password: '', role: 'member' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUserUpdate = async (id, updatedUser) => {
    try {
      await axios.put(`/api/users/${id}`, updatedUser);
      const usersRes = await axios.get('/api/users');
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleUserDelete = async (id) => {
    try {
      await axios.delete(`/api/users/${id}`);
      const usersRes = await axios.get('/api/users');
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('File uploaded: ' + response.data.filePath);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Worship Team Dashboard</h1>
      <p className="text-lg mb-4">Welcome, {user.username} ({user.role})</p>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <button
        onClick={() => {
          localStorage.removeItem('token');
          navigate('/login');
        }}
        className="bg-red-500 text-white p-2 rounded hover:bg-red-600 mb-6"
      >
        Logout
      </button>

      {/* Songs Section */}
      {(user.role === 'admin' || user.role === 'leader') && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-secondary mb-4">Manage Songs</h2>
          <form onSubmit={handleSongSubmit} className="mb-4">
            <input
              type="text"
              placeholder="Title"
              value={newSong.title}
              onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <input
              type="text"
              placeholder="Artist"
              value={newSong.artist}
              onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <input
              type="text"
              placeholder="Key Signature"
              value={newSong.key_signature}
              onChange={(e) => setNewSong({ ...newSong, key_signature: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <textarea
              placeholder="Lyrics"
              value={newSong.lyrics}
              onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })}
              className="p-2 border rounded w-full"
            />
            <button type="submit" className="bg-secondary text-white p-2 rounded hover:bg-blue-500 mt-2">
              Add Song
            </button>
          </form>
          <ul className="space-y-2">
            {songs.map(song => (
              <li key={song.id} className="border p-4 rounded">
                <p><strong>{song.title}</strong> by {song.artist}</p>
                <p>Key: {song.key_signature}</p>
                <p>{song.lyrics}</p>
                {(user.role === 'admin' || user.role === 'leader') && (
                  <div>
                    <button
                      onClick={() => {
                        const updatedSong = prompt('Enter new title, artist, key_signature, lyrics (JSON):', JSON.stringify(song));
                        if (updatedSong) handleSongUpdate(song.id, JSON.parse(updatedSong));
                      }}
                      className="bg-yellow-500 text-white p-1 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSongDelete(song.id)}
                      className="bg-red-500 text-white p-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Setlists Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary mb-4">Manage Setlists</h2>
        {(user.role === 'admin' || user.role === 'leader') && (
          <form onSubmit={handleSetlistSubmit} className="mb-4">
            <input
              type="text"
              placeholder="Setlist Name"
              value={newSetlist.name}
              onChange={(e) => setNewSetlist({ ...newSetlist, name: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <input
              type="date"
              value={newSetlist.date}
              onChange={(e) => setNewSetlist({ ...newSetlist, date: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <select
              multiple
              value={newSetlist.songIds}
              onChange={(e) => setNewSetlist({ ...newSetlist, songIds: Array.from(e.target.selectedOptions, option => parseInt(option.value)) })}
              className="p-2 border rounded"
            >
              {songs.map(song => (
                <option key={song.id} value={song.id}>{song.title}</option>
              ))}
            </select>
            <button type="submit" className="bg-secondary text-white p-2 rounded hover:bg-blue-500 mt-2">
              Add Setlist
            </button>
          </form>
        )}
        <ul className="space-y-2">
          {setlists.map(setlist => (
            <li key={setlist.id} className="border p-4 rounded">
              <p><strong>{setlist.name}</strong> ({setlist.date})</p>
              <p>Created by: {setlist.created_by_username}</p>
              {(user.role === 'admin' || user.role === 'leader') && (
                <div>
                  <button
                    onClick={() => {
                      const updatedSetlist = prompt('Enter new name, date, songIds (JSON):', JSON.stringify({ name: setlist.name, date: setlist.date, songIds: [] }));
                      if (updatedSetlist) handleSetlistUpdate(setlist.id, JSON.parse(updatedSetlist));
                    }}
                    className="bg-yellow-500 text-white p-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleSetlistDelete(setlist.id)}
                    className="bg-red-500 text-white p-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Users Section (Admin Only) */}
      {user.role === 'admin' && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-secondary mb-4">Manage Users</h2>
          <form onSubmit={handleUserSubmit} className="mb-4">
            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="p-2 border rounded mr-2"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="admin">Admin</option>
              <option value="leader">Leader</option>
              <option value="member">Member</option>
            </select>
            <button type="submit" className="bg-secondary text-white p-2 rounded hover:bg-blue-500 mt-2">
              Add User
            </button>
          </form>
          <ul className="space-y-2">
            {users.map(user => (
              <li key={user.id} className="border p-4 rounded">
                <p><strong>{user.username}</strong> ({user.role})</p>
                <button
                  onClick={() => {
                    const updatedUser = prompt('Enter new username, role, password (JSON, password optional):', JSON.stringify({ username: user.username, role: user.role }));
                    if (updatedUser) handleUserUpdate(user.id, JSON.parse(updatedUser));
                  }}
                  className="bg-yellow-500 text-white p-1 rounded mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleUserDelete(user.id)}
                  className="bg-red-500 text-white p-1 rounded"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File Upload Section */}
      {(user.role === 'admin' || user.role === 'leader') && (
        <div>
          <h2 className="text-2xl font-bold text-secondary mb-4">Upload File</h2>
          <input
            type="file"
            onChange={handleFileUpload}
            className="p-2 border rounded"
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
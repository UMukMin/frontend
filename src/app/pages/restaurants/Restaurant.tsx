import React from 'react';

const mockData = [
  { id: 1, name: 'Log 1', description: 'This is log 1' },
  { id: 2, name: 'Log 2', description: 'This is log 2' },
  { id: 3, name: 'Log 3', description: 'This is log 3' },
];

const Restaurant = () => {
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {mockData.map((log) => (
          <tr key={log.id}>
            <td>{log.id}</td>
            <td>{log.name}</td>
            <td>{log.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Restaurant;

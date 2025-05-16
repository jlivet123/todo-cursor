import React from 'react';
import Link from 'next/link';

const LeftNav = () => {
  return (
    <nav className="w-64 bg-gray-800 text-white h-full fixed">
      <ul className="p-4 space-y-4">
        <li className="font-bold">Dashboardxxx</li>
        <li>
          <Link href="/my-tasks">My Tasks</Link>
        </li>
        <li>
          <Link href="/sticky-notes">Sticky Notes</Link>
        </li>
        <li className="font-bold mt-8">Life</li>
        <li>
          <Link href="/decision-matrix">Decision Matrix</Link>
        </li>
        <li>Goals</li>
        <li className="font-bold mt-8">Rituals</li>
        <li>Daily</li>
        <li>Weekly</li>
        <li className="font-bold mt-8">Column Controls</li>
        <li>Collapse Personal</li>
        <li>Expand Personal</li>
        <li>Collapse Work</li>
        <li>Expand Work</li>
      </ul>
    </nav>
  );
};

export default LeftNav; 
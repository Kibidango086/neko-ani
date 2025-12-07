import React from 'react';
import { Link } from 'react-router-dom';
import { BangumiSubject } from '../types';

interface AnimeCardProps {
  subject: BangumiSubject;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ subject }) => {
  return (
    <Link to={`/subject/${subject.id}`} className="group relative block aspect-[2/3] overflow-hidden rounded-[1.5rem] bg-surface-container shadow-md transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl">
      <img
        src={subject.images?.large || subject.images?.common || 'https://picsum.photos/300/450'}
        alt={subject.name_cn || subject.name}
        className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141218] via-[#141218]/80 to-transparent p-4 pt-12">
        <h3 className="line-clamp-2 text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
          {subject.name_cn || subject.name}
        </h3>
        <div className="mt-1 flex items-center justify-between text-xs text-on-surface-variant">
           {subject.rating?.score ? (
               <span className="flex items-center text-primary-container bg-on-primary-container px-2 py-0.5 rounded-full font-bold">
                   ★ {subject.rating.score}
               </span>
           ) : <span>N/A</span>}
        </div>
      </div>
    </Link>
  );
};
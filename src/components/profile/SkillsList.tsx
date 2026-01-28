'use client';

interface Skill {
  id: string;
  name: string;
  mastery?: number; // 1-5
}

interface SkillsListProps {
  skills: Skill[];
  emptyMessage?: string;
}

export function SkillsList({ skills, emptyMessage = 'No skills yet' }: SkillsListProps) { // code_id:270
  if (skills.length === 0) {
    return <p className="skills-list-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="skills-list">
      {skills.map((skill) => (
        <li key={skill.id} className="skills-list-item">
          <span className="skills-list-name">{skill.name}</span>
          {skill.mastery && (
            <span className="skills-list-mastery" data-level={skill.mastery}>
              {['a', 'b', 'c', 'd', 'e'][skill.mastery - 1]}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

import { GlossaryTerm } from '../models';

export const GLOSSARY_SEED_DATA: GlossaryTerm[] = [
  // general_concepts
  {
    term: 'neurodiversity',
    definition:
      'The natural variation in how human brains work. It recognizes that differences in thinking, learning, and processing are a normal part of human diversity — not deficits to be fixed.',
    category: 'general_concepts',
  },
  {
    term: 'neurodivergent',
    definition:
      'A person whose brain works differently from what is considered typical. This includes autistic people, people with ADHD, dyslexia, and other neurological differences.',
    category: 'general_concepts',
  },
  {
    term: 'neurotypical',
    definition:
      "A person whose brain works in ways that are considered typical by societal standards. It's a neutral descriptor, not a value judgment.",
    category: 'general_concepts',
  },

  // autism_related
  {
    term: 'autism',
    definition:
      'A neurological difference that affects how a person experiences the world, communicates, and interacts socially. Autistic people often have unique strengths in pattern recognition, deep focus, and creative thinking.',
    category: 'autism_related',
  },
  {
    term: 'stimming',
    definition:
      "Self-stimulatory behavior like hand-flapping, rocking, or spinning. Stimming helps regulate sensory input and emotions — it's a natural and healthy coping mechanism.",
    category: 'autism_related',
  },
  {
    term: 'masking',
    definition:
      'When a neurodivergent person suppresses their natural behaviors to appear neurotypical. Masking is exhausting and can lead to burnout over time.',
    category: 'autism_related',
  },
  {
    term: 'meltdown',
    definition:
      'An intense response to overwhelming sensory or emotional input. Unlike a tantrum, a meltdown is not a choice — it happens when the nervous system is overloaded.',
    category: 'autism_related',
  },
  {
    term: 'shutdown',
    definition:
      "A withdrawal response to overwhelm where a person may become very quiet, unresponsive, or unable to communicate. It's the nervous system's way of protecting itself.",
    category: 'autism_related',
  },

  // adhd_related
  {
    term: 'ADHD',
    definition:
      'Attention Deficit Hyperactivity Disorder — a neurological difference affecting attention regulation, impulse control, and executive function. People with ADHD often have strengths in creativity, energy, and thinking outside the box.',
    category: 'adhd_related',
  },
  {
    term: 'executive function',
    definition:
      "The brain's management system that handles planning, organizing, starting tasks, and managing time. Differences in executive function are common in neurodivergent people and can be supported with the right strategies.",
    category: 'adhd_related',
  },

  // school_and_services
  {
    term: 'accommodation',
    definition:
      "A change to the environment, teaching method, or expectations that helps a neurodivergent person access learning or participate fully. Accommodations remove barriers — they don't give unfair advantages.",
    category: 'school_and_services',
  },
  {
    term: 'IEP',
    definition:
      "Individualized Education Program — a legal document that outlines the specific supports, services, and goals a child needs to succeed in school. It's developed collaboratively between parents, teachers, and specialists.",
    category: 'school_and_services',
  },

  // sensory
  {
    term: 'sensory processing',
    definition:
      'How the brain receives and interprets information from the senses (sight, sound, touch, taste, smell, movement, body awareness). Differences in sensory processing can make certain environments overwhelming or under-stimulating.',
    category: 'sensory',
  },
  {
    term: 'dysregulation',
    definition:
      'When the nervous system is out of balance — either overstimulated or understimulated — making it hard to manage emotions and behavior. It\'s a signal that something in the environment needs to change, not that the person is misbehaving.',
    category: 'sensory',
  },
];

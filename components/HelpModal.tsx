import { HelpSectionValues, HelpModalProps } from "@/utils/types";

const helpSections = {
  overview: {
    title: "Welcome to the Cellular Automaton Simulator",
    content: `This is a high-performance cellular automata simulator powered by WebGPU. You can configure multiple rule sets, create custom patterns, and watch them evolve in real-time.
    Click 'Random' to initialize the grid with the selected density, and press 'Start' to watch the simulation!\n\n
    Want to explore more? Check out the project on <a href="https://github.com/omarabdiwali/cellular-automaton" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline">GitHub</a>!`
  },
  simulation: {
    title: "Simulation Controls",
    content: `• **Start/Stop**: Toggle the simulation animation
    • **Speed**: Adjust frames per second (1-60 FPS)
    • **Density**: Set probability for random grid generation (0-100%)
    • **Random**: Generate a new random grid
    • **Clear**: Reset to all dead cells
    • Grid size auto-adjusts to your screen width`
  },
  masks: {
    title: "Mask Rules",
    content: `• **4 independent masks** (n1-n4): Each defines neighborhood patterns
    • **Blue cells**: Valid neighbor positions for counting
    • **Red center**: Focal cell (excluded from counting)
    • **Enable/Disable**: Toggle each mask's effect
    • **Click/Drag**: Add or remove cells in mask grids
    • **Born Rules**: When a dead cell becomes alive (configured in Rules section)
    • **Survival Rules**: When an alive cell stays alive (configured in Rules section)

    **Important Mask Behavior:**
    If a mask is enabled with no cells (empty) and no Born/Survival rules are set, it will activate all cells
    **Tip**: When initializing a new mask:
    1. Pause the simulation before enabling
    2. Configure cells and rules
    3. Enable the mask and resume simulation`
  },
  rules: {
    title: "Rules Configuration",
    content: `Each mask has two types of rules:
    • **Born**: Lower/Upper range for neighbor count that causes birth
    • **Survival**: Lower/Upper range for neighbor count that causes survival

    **Example (Conway's Game of Life)**:
    • Born: 3/3 (exactly 3 neighbors)
    • Survival: 2/3 (2 or 3 neighbors)

    Multiple enabled masks work additively - a cell survives/births if ANY rule matches.`
  },
  examples: {
    title: "Example Patterns",
    content: `**Conway's Game of Life** (n1 default):
    • Born: 3/3, Survival: 2/3
    • Pattern: All cells around center (except center)

    **Custom Experiments**:
    • Try different neighbor patterns
    • Combine multiple masks
    • Adjust density for varied starting conditions`
  },
  performance: {
    title: "Performance & Browser Support",
    content: `• **WebGPU acceleration**: Requires Chrome 113+, Edge 113+, or Firefox 125+ (with flags)
    • **Large grids**: Dynamically sized based on your screen
    • **Real-time updates**: Rule changes apply immediately
    • **Mobile support**: Responsive layout for smaller screens`
  }
};

export default function HelpModal({
  isOpen,
  onClose,
  currentSection,
  onSectionChange,
}: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-[600px] h-[600px] flex flex-col">
        <div className="flex border-b border-gray-700">
          {Object.keys(helpSections).map((section) => (
            <button
              key={section}
              onClick={() => onSectionChange(section as HelpSectionValues)}
              className={`px-4 py-2 text-sm ${currentSection === section
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-300 hover:bg-gray-700'
                }`}
            >
              {helpSections[section as HelpSectionValues].title.split(' ')[0]}
            </button>
          ))}
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">{helpSections[currentSection].title}</h2>
          <div className="prose prose-invert prose-sm">
            {helpSections[currentSection].content.split('\n\n').map((paragraph, index) => (
              <div key={index}>
                {paragraph.split('\n').map((line, lineIndex) => (
                  <p key={lineIndex} className="mb-2" dangerouslySetInnerHTML={{
                    __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                ))}
                {index < helpSections[currentSection].content.split('\n\n').length - 1 && (
                  <hr className="my-4 border-gray-700" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
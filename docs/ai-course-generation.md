# AI-Generated Course Content Feature

## Overview
The course player now automatically generates structured course outlines using AI analysis of video transcripts. This feature leverages AssemblyAI for transcription and intelligent topic detection to create hierarchical course modules.

## How It Works

### Architecture Flow

```
Video Upload → AssemblyAI Transcription → Text Analysis → AI Course Generation → Dynamic Sidebar
```

1. **Video Transcription**: When a course video is loaded, it's automatically transcribed using AssemblyAI
2. **Content Analysis**: The transcript text is analyzed for educational keywords and topic indicators
3. **Module Generation**: AI generates a structured course outline with modules and lessons
4. **Dynamic Display**: The generated outline appears in the Course Content sidebar with visual indicators

### Features

- ✅ **Automatic Generation**: Runs automatically after transcription completes
- ✅ **Manual Trigger**: "Generate AI Outline" button for on-demand generation
- ✅ **Intelligent Topic Detection**: Analyzes keywords like "CPU", "memory", "architecture", "algorithm"
- ✅ **Hierarchical Structure**: Creates 3-6 main modules with 2-5 lessons each
- ✅ **Duration Estimates**: Provides estimated lesson durations
- ✅ **Visual Feedback**: Sparkles icon indicates AI-generated content
- ✅ **Fallback Support**: Uses default structure if AI generation fails

## Implementation Details

### API Endpoint
**POST** `/api/content/generate-modules`

**Request Body:**
```json
{
  "transcriptText": "Full transcript of the video...",
  "courseTitle": "Introduction to Computer Architecture"
}
```

**Response:**
```json
{
  "success": true,
  "modules": [
    {
      "title": "1. Introduction & Foundations",
      "lessons": [
        { "title": "Course Overview", "duration": "6m" },
        { "title": "Core Concepts", "duration": "10m" }
      ]
    }
  ],
  "courseTitle": "Course Content"
}
```

### Component Integration

The `CoursePlayer` component includes:
- `courseModules` state for storing generated modules
- `modulesLoading` state for loading indicator
- `useEffect` hook that triggers generation when transcription completes
- Button handler for manual generation

```tsx
// State
const [courseModules, setCourseModules] = useState<CourseModule[]>([])
const [modulesLoading, setModulesLoading] = useState(false)

// Auto-generation on transcript completion
useEffect(() => {
  async function generateModules() {
    if (transcribeStatus !== "completed") return
    // ... generation logic
  }
  generateModules()
}, [transcribeStatus, transcriptSegments])
```

### Topic Detection Algorithm

The AI uses keyword frequency and positioning to identify course topics:

**Educational Keywords:**
- **Foundations**: introduction, overview, basics, fundamentals
- **Architecture**: cpu, processor, architecture, system, component
- **Memory**: memory, cache, storage, data
- **Algorithms**: algorithm, method, technique, implementation
- **Advanced**: optimization, performance, complex

**Module Generation Logic:**
1. Clean and tokenize transcript text
2. Count keyword occurrences and track positions
3. Sort topics by frequency and appearance order
4. Group related topics into modules
5. Generate contextual lesson names
6. Assign estimated durations (10-15 minutes per lesson)

## Configuration

### Environment Variables

```bash
# Required for transcription and AI generation
ASSEMBLYAI_API_KEY=your_api_key_here
```

Get your API key from [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard)

### Customization Options

#### Adjust Module Count
In `app/api/content/generate-modules/route.ts`:
```typescript
// Change minimum modules
if (modules.length < 3) { // Change 3 to your preferred minimum
  // Add more modules
}
```

#### Modify Keywords
Add domain-specific keywords:
```typescript
const topicIndicators = [
  'your', 'custom', 'keywords',
  // ... existing keywords
]
```

#### Change Duration Estimates
```typescript
lessons: [
  { title: "Lesson Name", duration: "15m" }, // Change duration format
]
```

## Usage Examples

### Example 1: Computer Architecture Course

**Input Transcript:**
> "Welcome to Computer Architecture. Today we'll explore CPU fundamentals, memory hierarchies, and instruction cycles..."

**Generated Output:**
```
1. Introduction & Foundations
   - What is Computer Architecture? (6m)
   - Core Concepts (10m)
   - Historical Context (8m)

2. The CPU & Processing
   - ALU & Registers (12m)
   - Instruction Cycles (14m)
   - Control Unit (10m)

3. Memory Systems
   - Memory Hierarchy (11m)
   - Cache Organization (13m)
   - Virtual Memory (15m)
```

### Example 2: Data Structures Course

**Input Transcript:**
> "Let's start with arrays and linked lists, then move to trees and graphs..."

**Generated Output:**
```
1. Introduction & Foundations
   - Course Overview (6m)
   - Core Concepts (10m)

2. Data Processing & Algorithms
   - Data Structures (12m)
   - Processing Techniques (14m)

3. Advanced Topics
   - Performance Optimization (15m)
   - Real-World Applications (12m)
```

## UI Components

### Course Content Sidebar

The sidebar displays:
- **Header**: "Course Content" with optional "Generate AI Outline" button
- **AI Badge**: Sparkles icon with "AI-Generated Outline" label
- **Modules**: Numbered modules with collapsible lessons
- **Loading State**: Animated sparkles during generation
- **Fallback**: Default structure if transcription unavailable

### Visual Indicators

```tsx
// AI-Generated indicator
<Sparkles className="h-3.5 w-3.5 text-primary" />
AI-Generated Outline

// Loading state
<Sparkles className="h-5 w-5 animate-pulse text-primary" />
Generating course outline with AI...
```

## Testing

### Manual Testing Steps

1. **Navigate to a course**: Go to `/courses/[id]`
2. **Load video lesson**: Select a lesson with video content
3. **Wait for transcription**: Observe status in sidebar
4. **View generated outline**: Check Course Content sidebar
5. **Verify structure**: Ensure modules and lessons are relevant

### Test with Mock Data

```typescript
// In CoursePlayer component
const mockTranscript = [
  { time: "0:00", text: "Introduction to CPU architecture..." },
  { time: "1:00", text: "Memory systems and cache hierarchy..." },
  // ... more segments
]
```

## Troubleshooting

### Issue: Modules Not Generating

**Possible Causes:**
1. Transcription not completed
2. Empty or short transcript (< 50 characters)
3. Missing AssemblyAI API key

**Solutions:**
- Check `transcribeStatus === "completed"`
- Verify transcript has substantial content
- Ensure `.env.local` has `ASSEMBLYAI_API_KEY`

### Issue: Generic Modules Only

**Possible Causes:**
1. Transcript lacks educational keywords
2. Content too short for analysis

**Solutions:**
- Add custom keywords to detection algorithm
- Use manual "Generate AI Outline" button
- Provide longer, more detailed transcript

### Issue: Loading Indefinitely

**Possible Causes:**
1. API endpoint error
2. Network timeout
3. Invalid transcript format

**Solutions:**
- Check browser console for errors
- Verify API route at `/api/content/generate-modules`
- Test with curl: `curl -X POST http://localhost:3000/api/content/generate-modules -H "Content-Type: application/json" -d '{"transcriptText":"test"}'`

## Performance Considerations

- **Generation Time**: < 1 second for typical transcripts
- **Caching**: Generated modules stored in component state
- **Fallback**: Always provides default structure if AI fails
- **No External API Calls**: All processing happens server-side

## Future Enhancements

- [ ] Save generated outlines to Firestore
- [ ] Allow teachers to edit AI-generated modules
- [ ] Multi-language support for transcript analysis
- [ ] Integration with LLMs (GPT-4, Claude) for better accuracy
- [ ] Per-lesson video timestamp mapping
- [ ] Difficulty level indicators
- [ ] Prerequisites detection

## Related Features

- **Video Transcription**: `/app/api/transcribe/start/route.ts`
- **Course Player**: `/components/learning/course-player.tsx`
- **AWS Services**: `/lib/aws-services.ts`

## Resources

- [AssemblyAI Documentation](https://www.assemblyai.com/docs)
- [AssemblyAI Pricing](https://www.assemblyai.com/pricing)
- [Course Player Component](../components/learning/course-player.tsx)
- [Module Generation API](../app/api/content/generate-modules/route.ts)

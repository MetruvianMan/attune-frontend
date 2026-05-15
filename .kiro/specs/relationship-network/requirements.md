# Requirements Document

## Introduction

The Relationship Network feature adds a dedicated "Relationships" tab to the Attune app that visually represents a child's support system as an interactive network graph. Parents can define the people in their child's life — family members, friends, childcare providers, and professional support team members — with photos, role labels, and private notes. The structured relationship data integrates with the Insight Engine and Conversation system so that when a parent mentions a person by name in logs, chat, or voice entries, the app understands who that person is, their role, their relationship category, and any special context. This transforms the existing unstructured `persons` string array on Events into a rich, contextual relationship model that improves insight quality and conversational understanding.

## Glossary

- **Relationship_Network**: The complete set of Relationship_Persons associated with a Child_Profile, visualized as an interactive network graph with the child at the center.
- **Relationship_Person**: A structured record representing an individual in the child's support system, containing an identifier, name, category, role label, optional photo, optional notes, and association with a Child_Profile.
- **Relationship_Category**: A classification grouping for a Relationship_Person. Valid categories are: Family, Friends, Childcare, and Professional.
- **Role_Label**: A short descriptor (chiron) displayed alongside a Relationship_Person's name in the network visualization (e.g., "Mom", "Nanny", "OT", "Best Friend", "Grandpa").
- **Relationship_Note**: A private text annotation attached to a Relationship_Person containing contextual information about the relationship that is not fully visible in the network view but accessible on demand (e.g., "Former nanny — left in March 2024, child still mentions her frequently").
- **Network_Visualization**: The interactive graph-style rendering of the Relationship_Network, displaying Relationship_Persons as nodes connected to the child at the center, with visual differentiation by category and priority.
- **Person_Photo**: An image file (JPEG or PNG) uploaded by the Parent and associated with a Relationship_Person for display in the Network_Visualization.
- **Person_Resolution**: The process by which the NLP_Pipeline and Insight_Engine match a name string mentioned in Events, Context_Entries, or Conversation_Sessions to a defined Relationship_Person, enriching the reference with category, role, and notes context.
- **Insight_Engine**: The core analytical subsystem that detects patterns across Events, Context_Entries, and Document_Archive contents (as defined in the MVP spec).
- **NLP_Pipeline**: The natural language processing pipeline used for voice transcription, tag extraction, insight narrative generation, and conversational dialogue (as defined in the MVP spec).
- **Conversation_System**: The conversational natural language interface that allows the Parent to ask questions about their child's data (as defined in the MVP spec).

## Requirements

### Requirement 1: Relationship Person Management

**User Story:** As a Parent, I want to add, edit, and remove people in my child's support system with structured information, so that the app understands who each person is and their role in my child's life.

#### Acceptance Criteria

1. THE application SHALL allow the Parent to create a Relationship_Person with a name, Relationship_Category (Family, Friends, Childcare, or Professional), and Role_Label for the active Child_Profile.
2. THE application SHALL require the name and Relationship_Category fields when creating a Relationship_Person; the Role_Label SHALL default to the Relationship_Category name if not provided.
3. WHEN the Parent creates a Relationship_Person, THE application SHALL generate a unique identifier and persist the record to local storage.
4. THE application SHALL allow the Parent to edit the name, Relationship_Category, and Role_Label of an existing Relationship_Person.
5. THE application SHALL allow the Parent to delete a Relationship_Person, removing the record and associated Person_Photo from local storage.
6. WHEN the Parent deletes a Relationship_Person, THE application SHALL display a confirmation dialog before permanently removing the record.
7. THE application SHALL allow the Parent to attach a Relationship_Note to a Relationship_Person containing free-text contextual information about the relationship.
8. THE application SHALL allow the Parent to edit or clear the Relationship_Note on an existing Relationship_Person.

### Requirement 2: Photo Management

**User Story:** As a Parent, I want to upload, replace, and remove photos for each person in my child's network, so that the visual representation is personalized and recognizable.

#### Acceptance Criteria

1. THE application SHALL allow the Parent to upload a Person_Photo (JPEG or PNG format) for a Relationship_Person.
2. WHEN the Parent uploads a Person_Photo, THE application SHALL store the image data in local storage and associate the image with the Relationship_Person.
3. THE application SHALL allow the Parent to overwrite an existing Person_Photo by uploading a new image, replacing the previous image in local storage.
4. THE application SHALL allow the Parent to delete a Person_Photo, removing the image data from local storage and reverting the Relationship_Person's display to a default placeholder.
5. WHEN no Person_Photo is set for a Relationship_Person, THE Network_Visualization SHALL display a default placeholder icon with the person's initials.

### Requirement 3: Network Visualization

**User Story:** As a Parent, I want to see my child's support system displayed as an interactive network graph, so that I can quickly understand the people around my child and their roles at a glance.

#### Acceptance Criteria

1. THE Network_Visualization SHALL display the child at the center of the graph with Relationship_Persons arranged as nodes connected to the center.
2. THE Network_Visualization SHALL visually differentiate Relationship_Persons by Relationship_Category using distinct colors for each category (Family, Friends, Childcare, Professional).
3. THE Network_Visualization SHALL display Family category Relationship_Persons with larger node sizes than other categories to indicate priority.
4. THE Network_Visualization SHALL display each Relationship_Person node with the Person_Photo (or placeholder), the person's name, and the Role_Label.
5. THE Network_Visualization SHALL dynamically adjust the layout when Relationship_Persons are added or removed, repositioning nodes to maintain a balanced arrangement.
6. WHEN the Parent taps a Relationship_Person node in the Network_Visualization, THE application SHALL display the full detail view including the Relationship_Note, photo, name, category, and Role_Label.
7. THE Network_Visualization SHALL group Relationship_Persons by Relationship_Category in distinct spatial regions of the graph.
8. WHEN no Relationship_Persons exist for the active Child_Profile, THE Network_Visualization SHALL display an empty state with a prompt to add the first person.

### Requirement 4: Relationships Tab Navigation

**User Story:** As a Parent, I want a dedicated Relationships tab in the app navigation, so that I can access and manage my child's support network from the main interface.

#### Acceptance Criteria

1. THE application SHALL add a "Relationships" tab to the main tab bar navigation between the existing tabs.
2. WHEN the Parent selects the Relationships tab, THE application SHALL display the Network_Visualization for the active Child_Profile.
3. THE Relationships tab SHALL provide an "Add Person" action accessible from the network view for creating new Relationship_Persons.
4. WHEN the Parent switches the active Child_Profile, THE Relationships tab SHALL refresh to display the Relationship_Network for the newly selected profile.

### Requirement 5: Person Resolution in NLP Pipeline

**User Story:** As a Parent, I want the app to recognize names I mention in logs and conversations as people in my child's network, so that the app understands the context without me having to explain who someone is every time.

#### Acceptance Criteria

1. WHEN the NLP_Pipeline extracts person names from a voice transcript or manual entry, THE Person_Resolution process SHALL attempt to match each extracted name against the Relationship_Persons defined for the active Child_Profile.
2. WHEN a name match is found during Person_Resolution, THE application SHALL associate the Event or Context_Entry with the matched Relationship_Person's identifier rather than storing only the raw name string.
3. WHEN a name match is found during Person_Resolution, THE NLP_Pipeline SHALL make the matched Relationship_Person's category, Role_Label, and Relationship_Note available as context for downstream processing.
4. IF the NLP_Pipeline extracts a name that does not match any defined Relationship_Person, THEN THE application SHALL store the raw name string as currently implemented and continue processing without error.
5. THE Person_Resolution process SHALL perform case-insensitive matching and handle common name variations (e.g., "grandma" matching a Relationship_Person with Role_Label "Grandma" or name "Margaret").

### Requirement 6: Insight Engine Integration

**User Story:** As a Parent, I want the Insight Engine to use relationship context when detecting patterns, so that insights about my child's behavior can reference specific people and their roles meaningfully.

#### Acceptance Criteria

1. WHEN the Insight_Engine analyzes correlations involving person-tagged Events, THE Insight_Engine SHALL reference the Relationship_Person's name and Role_Label in the insight narrative rather than using only the raw name string.
2. WHEN the Insight_Engine detects a pattern involving a specific Relationship_Person across multiple Events, THE Insight_Engine SHALL include the person's Relationship_Category and Role_Label in the supporting signals.
3. WHEN the Insight_Engine generates strategy recommendations involving a Relationship_Person, THE Insight_Engine SHALL incorporate the Relationship_Note context to produce more relevant suggestions.
4. THE Insight_Engine SHALL use Relationship_Category information to group and weight relational patterns (e.g., distinguishing family-related patterns from professional-support-related patterns).

### Requirement 7: Conversation System Integration

**User Story:** As a Parent, I want to mention people by name in chat and have the app understand who I'm talking about, so that conversations feel natural and the responses are contextually aware.

#### Acceptance Criteria

1. WHEN the Parent mentions a person's name in a Conversation_Session query, THE Conversation_System SHALL resolve the name to the matching Relationship_Person and include the person's category, Role_Label, and Relationship_Note as context for generating the response.
2. WHEN the Conversation_System generates a response referencing a Relationship_Person, THE Conversation_System SHALL use the person's name and Role_Label naturally in the narrative (e.g., "Karen (former nanny)" or "interactions with his OT, Dr. Smith").
3. IF the Parent asks about a specific person in a Conversation_Session, THEN THE Conversation_System SHALL search Events and Context_Entries associated with that Relationship_Person and provide relevant data in the response.
4. WHEN the Parent asks a general question about relationships or social patterns, THE Conversation_System SHALL use the full Relationship_Network to provide context-aware answers grouped by Relationship_Category.

### Requirement 8: Relationship Data Serialization

**User Story:** As a developer, I want Relationship_Person records to be reliably serialized and deserialized, so that relationship data persists correctly across application sessions.

#### Acceptance Criteria

1. THE application SHALL serialize each Relationship_Person (including identifier, name, Relationship_Category, Role_Label, Relationship_Note, Person_Photo reference, and Child_Profile association) to a JSON representation for local storage.
2. THE application SHALL deserialize JSON payloads back into valid Relationship_Person objects with full fidelity.
3. FOR ALL valid Relationship_Person objects, serializing to JSON then deserializing back SHALL produce an equivalent Relationship_Person object (round-trip property).
4. IF the application encounters a malformed Relationship_Person JSON during deserialization, THEN THE application SHALL skip the malformed record, log a warning, and continue loading remaining records.
5. THE application SHALL serialize Person_Photo data as a base64-encoded string within the Relationship_Person JSON representation.

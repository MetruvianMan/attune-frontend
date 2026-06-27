import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, Text, TouchableOpacity, Dimensions, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { RelationshipPerson } from '../models';
import Svg, { Circle, Line, Image as SvgImage, Defs, RadialGradient, Stop, ClipPath, G, Text as SvgText } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

interface CircleNetworkViewProps {
  persons: RelationshipPerson[];
  childName: string;
  childPhotoUri: string | null;
  onPersonPress: (person: RelationshipPerson) => void;
}

// Softer, less saturated category colors
const CATEGORY_COLORS: Record<string, string> = {
  Family: '#7FBF9F',
  'Family (Extended)': '#5DADE2',
  Friends: '#88A9C3',
  Childcare: '#E8B86D',
  Professional: '#A896B5',
  Other: '#95a5a6',
};

const CATEGORY_ORDER = ['Family', 'Family (Extended)', 'Friends', 'Childcare', 'Professional'];

// Adaptive sizing based on network size - emphasize center node more
function getAdaptiveSizes(personCount: number) {
  if (personCount <= 10) {
    // Small networks: generous sizing, strong center emphasis
    return {
      centerRadius: 100, // Larger center node
      familyNodeRadius: 65,
      extendedFamilyNodeRadius: 65,
      defaultNodeRadius: 54,
      minGap: 18,
      orbitBase: 240,
    };
  } else if (personCount <= 20) {
    // Medium networks: balanced sizing, preserve center emphasis
    return {
      centerRadius: 95,
      familyNodeRadius: 62,
      extendedFamilyNodeRadius: 62,
      defaultNodeRadius: 52,
      minGap: 16,
      orbitBase: 220,
    };
  } else {
    // Large networks: still keep center prominent
    return {
      centerRadius: 90,
      familyNodeRadius: 58,
      extendedFamilyNodeRadius: 58,
      defaultNodeRadius: 50,
      minGap: 14,
      orbitBase: 200,
    };
  }
}

// Dynamic orbit radius based on person count
function getOrbitRadius(personCount: number, sizes: ReturnType<typeof getAdaptiveSizes>): number {
  if (personCount <= 6) {
    return sizes.orbitBase;
  } else {
    // Expand outward for larger networks
    return sizes.orbitBase + (personCount - 6) * 14;
  }
}

interface NetworkNode {
  id: string;
  name: string;
  roleLabel: string;
  category: string;
  photoPath?: string;
  x: number;
  y: number;
  radius: number;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

function computeNetworkLayout(
  persons: RelationshipPerson[],
  containerWidth: number,
  containerHeight: number
): { centerNode: { x: number; y: number; radius: number }; personNodes: NetworkNode[]; requiredSpace: { width: number; height: number } } {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  if (persons.length === 0) {
    return {
      centerNode: { x: centerX, y: centerY, radius: 100 },
      personNodes: [],
      requiredSpace: { width: containerWidth, height: containerHeight },
    };
  }

  const personCount = persons.length;
  const sizes = getAdaptiveSizes(personCount);

  // Order persons by category
  const ordered: RelationshipPerson[] = [];
  for (const cat of CATEGORY_ORDER) {
    ordered.push(...persons.filter((p) => p.category === cat));
  }

  const count = ordered.length;
  const orbitRadius = getOrbitRadius(count, sizes);
  const maxNodeRadius = Math.max(sizes.familyNodeRadius, sizes.extendedFamilyNodeRadius);
  const minChord = 2 * maxNodeRadius + sizes.minGap;
  const minOrbitForNoOverlap = count > 1
    ? minChord / (2 * Math.sin(Math.PI / count))
    : orbitRadius;

  const minOrbitFromCenter = sizes.centerRadius + 50 + maxNodeRadius;
  const finalOrbitRadius = Math.max(minOrbitFromCenter, Math.max(orbitRadius, minOrbitForNoOverlap));

  const personNodes: NetworkNode[] = [];
  const startAngle = 270; // top of circle
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const person = ordered[i];
    const angleDeg = startAngle + angleStep * i;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = centerX + finalOrbitRadius * Math.cos(angleRad);
    const y = centerY + finalOrbitRadius * Math.sin(angleRad);
    const radius = (person.category === 'Family' || person.category === 'Family (Extended)')
      ? (person.category === 'Family' ? sizes.familyNodeRadius : sizes.extendedFamilyNodeRadius)
      : sizes.defaultNodeRadius;

    personNodes.push({
      id: person.id,
      name: person.name,
      roleLabel: person.role,
      category: person.category || 'Friends',
      photoPath: person.photoPath,
      x,
      y,
      radius,
    });
  }

  // Calculate required space
  const margin = maxNodeRadius + 60; // space for nodes + labels
  const requiredWidth = (finalOrbitRadius + margin) * 2;
  const requiredHeight = (finalOrbitRadius + margin) * 2;

  return {
    centerNode: { x: centerX, y: centerY, radius: sizes.centerRadius },
    personNodes,
    requiredSpace: { width: requiredWidth, height: requiredHeight },
  };
}

export function CircleNetworkView({ persons, childName, childPhotoUri, onPersonPress }: CircleNetworkViewProps) {
  const personCount = persons.length;
  const screenWidth = Dimensions.get('window').width;
  
  // Adaptive canvas sizing
  let svgWidth: number;
  let svgHeight: number;
  let initialScale = 1;
  
  if (personCount <= 10) {
    // Small networks: fit elegantly on screen
    svgWidth = Math.max(620, screenWidth * 1.25);
    svgHeight = 620;
    initialScale = 1;
  } else if (personCount <= 20) {
    // Medium networks: expand canvas
    const scaleFactor = 1 + (personCount - 10) * 0.09;
    svgWidth = Math.ceil(620 * scaleFactor);
    svgHeight = Math.ceil(620 * scaleFactor);
    initialScale = 0.82; // Start slightly zoomed out
  } else {
    // Large networks: significant expansion
    const scaleFactor = 1 + (personCount - 10) * 0.11;
    svgWidth = Math.ceil(620 * scaleFactor);
    svgHeight = Math.ceil(620 * scaleFactor);
    initialScale = 0.68; // Start more zoomed out
  }
  
  const layout = computeNetworkLayout(persons, svgWidth, svgHeight);

  // Pan and zoom state (for networks > 10)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(initialScale)).current;
  const [currentScale, setCurrentScale] = useState(initialScale);
  const [isPanning, setIsPanning] = useState(false);

  // Track pinch gesture state
  const lastScale = useRef(initialScale);
  const lastDistance = useRef(0);

  const enableInteraction = personCount > 10;

  // Calculate distance between two touches
  const getDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const [touch1, touch2] = touches;
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableInteraction,
      onMoveShouldSetPanResponder: () => enableInteraction,
      onPanResponderGrant: (evt) => {
        setIsPanning(true);
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });

        // Track initial distance for pinch
        if (evt.nativeEvent.touches.length === 2) {
          lastDistance.current = getDistance(evt.nativeEvent.touches);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Pinch to zoom
          const currentDistance = getDistance(touches);
          if (lastDistance.current > 0) {
            const zoomChange = currentDistance / lastDistance.current;
            const newScale = Math.max(0.5, Math.min(3, lastScale.current * zoomChange));
            scale.setValue(newScale);
            setCurrentScale(newScale);
          }
          lastDistance.current = currentDistance;
        } else if (touches.length === 1) {
          // Pan with one finger
          Animated.event([null, { dx: pan.x, dy: pan.y }], {
            useNativeDriver: false,
          })(evt, gestureState);
        }
      },
      onPanResponderRelease: () => {
        setIsPanning(false);
        pan.flattenOffset();
        // @ts-ignore
        lastScale.current = scale._value;
        lastDistance.current = 0;
      },
    })
  ).current;

  // Reset zoom and pan when person count changes
  useEffect(() => {
    if (enableInteraction) {
      Animated.parallel([
        Animated.spring(pan.x, { toValue: 0, useNativeDriver: false }),
        Animated.spring(pan.y, { toValue: 0, useNativeDriver: false }),
        Animated.spring(scale, { toValue: initialScale, useNativeDriver: false }),
      ]).start();
      setCurrentScale(initialScale);
      lastScale.current = initialScale;
    }
  }, [personCount]);

  // Reduced whitespace - tighter container
  const containerHeight = personCount <= 10 ? 520 : personCount <= 20 ? 560 : 600;

  const svgContent = (
    <Svg width="100%" height={containerHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      <Defs>
        {/* Softer gradient for center node */}
        <RadialGradient id="center-gradient">
          <Stop offset="0%" stopColor="#4A90E2" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#7FBF9F" stopOpacity="0.9" />
        </RadialGradient>

        {/* Clip paths for photos */}
        <ClipPath id="clip-center">
          <Circle
            cx={layout.centerNode.x}
            cy={layout.centerNode.y}
            r={layout.centerNode.radius}
          />
        </ClipPath>

        {layout.personNodes.map((node) => (
          <ClipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
            <Circle cx={node.x} cy={node.y} r={node.radius} />
          </ClipPath>
        ))}
      </Defs>

      {/* Draw connecting lines - stronger, softer colors */}
      {layout.personNodes.map((node) => (
        <Line
          key={`line-${node.id}`}
          x1={layout.centerNode.x}
          y1={layout.centerNode.y}
          x2={node.x}
          y2={node.y}
          stroke={CATEGORY_COLORS[node.category] || '#88A9C3'}
          strokeWidth="3"
          strokeOpacity="0.35"
        />
      ))}

      {/* Center node - child's photo with enhanced prominence */}
      <Circle
        cx={layout.centerNode.x}
        cy={layout.centerNode.y}
        r={layout.centerNode.radius + 8}
        fill="#4A90E2"
        opacity="0.12"
      />

      {childPhotoUri ? (
        <>
          <SvgImage
            x={layout.centerNode.x - layout.centerNode.radius}
            y={layout.centerNode.y - layout.centerNode.radius}
            width={layout.centerNode.radius * 2}
            height={layout.centerNode.radius * 2}
            href={childPhotoUri}
            clipPath="url(#clip-center)"
            preserveAspectRatio="xMidYMid slice"
          />
          <Circle
            cx={layout.centerNode.x}
            cy={layout.centerNode.y}
            r={layout.centerNode.radius}
            fill="none"
            stroke="#4A90E2"
            strokeWidth="4"
          />
        </>
      ) : (
        <>
          <Circle
            cx={layout.centerNode.x}
            cy={layout.centerNode.y}
            r={layout.centerNode.radius}
            fill="url(#center-gradient)"
          />
          <SvgText
            x={layout.centerNode.x}
            y={layout.centerNode.y + 8}
            textAnchor="middle"
            fill="white"
            fontSize="22"
            fontWeight="700"
          >
            {getInitials(childName)}
          </SvgText>
        </>
      )}

      {/* Child's name - enhanced typography */}
      <SvgText
        x={layout.centerNode.x}
        y={layout.centerNode.y + layout.centerNode.radius + 26}
        textAnchor="middle"
        fill="#1a1a1a"
        fontSize="18"
        fontWeight="800"
        letterSpacing="0.4"
      >
        {childName}
      </SvgText>

      {/* Person nodes */}
      {layout.personNodes.map((node, index) => (
        <PersonNode
          key={node.id}
          node={node}
          index={index}
          onPress={() => {
            if (!isPanning) {
              const person = persons.find(p => p.id === node.id);
              if (person) onPersonPress(person);
            }
          }}
        />
      ))}
    </Svg>
  );

  return (
    <View style={styles.container} {...(enableInteraction ? panResponder.panHandlers : {})}>
      {enableInteraction && (
        <Text style={styles.zoomHint}>
          Pinch to zoom • Drag to pan
        </Text>
      )}
      {enableInteraction ? (
        <Animated.View
          style={{
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          }}
        >
          {svgContent}
        </Animated.View>
      ) : (
        svgContent
      )}
    </View>
  );
}

interface PersonNodeProps {
  node: NetworkNode;
  index: number;
  onPress: () => void;
}

function PersonNode({ node, index, onPress }: PersonNodeProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create floating animation with random delay and duration
    const randomDelay = Math.random() * 2000;
    const duration = 3500 + Math.random() * 2000;

    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -4,
            duration: duration / 2,
            delay: randomDelay,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 3,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate();
  }, [floatAnim]);

  return (
    <AnimatedG
      onPress={onPress}
      style={{
        transform: [{ translateY: floatAnim }],
      }}
    >
      {node.photoPath ? (
        <>
          {/* White padding ring - extends 4px beyond photo */}
          <Circle
            cx={node.x}
            cy={node.y}
            r={node.radius + 4}
            fill="white"
          />
          {/* Photo clipped to original radius */}
          <SvgImage
            x={node.x - node.radius}
            y={node.y - node.radius}
            width={node.radius * 2}
            height={node.radius * 2}
            href={node.photoPath}
            clipPath={`url(#clip-${node.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Colored border - 5px wide, drawn at white ring edge */}
          <Circle
            cx={node.x}
            cy={node.y}
            r={node.radius + 4}
            fill="none"
            stroke={CATEGORY_COLORS[node.category] || '#88A9C3'}
            strokeWidth="5"
          />
        </>
      ) : (
        <>
          <Circle
            cx={node.x}
            cy={node.y}
            r={node.radius}
            fill={CATEGORY_COLORS[node.category] || '#88A9C3'}
            opacity="0.92"
          />
          <SvgText
            x={node.x}
            y={node.y + 6}
            textAnchor="middle"
            fill="white"
            fontSize={node.radius * 0.58}
            fontWeight="700"
          >
            {getInitials(node.name)}
          </SvgText>
        </>
      )}

      {/* Name text - enhanced typography */}
      <SvgText
        x={node.x}
        y={node.y + node.radius + 20}
        textAnchor="middle"
        fill="#1a1a1a"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.3"
      >
        {node.name}
      </SvgText>

      {/* Role label - smaller, lighter */}
      {node.name.toLowerCase() !== node.roleLabel.toLowerCase() && (
        <SvgText
          x={node.x}
          y={node.y + node.radius + 36}
          textAnchor="middle"
          fill="#95a5a6"
          fontSize="11"
          fontWeight="400"
        >
          {node.roleLabel}
        </SvgText>
      )}
    </AnimatedG>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  zoomHint: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    color: '#95a5a6',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignSelf: 'center',
    zIndex: 10,
    overflow: 'hidden',
    fontWeight: '500',
  },
});

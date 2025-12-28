import React, { useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface LockExplainerModalProps {
    visible: boolean;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export function LockExplainerModal({ visible, onClose }: LockExplainerModalProps) {
    const scale = new Animated.Value(0.95);
    const opacity = new Animated.Value(0);
    const lockRotate = new Animated.Value(0);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Continuous lock animation loop
            const rotateAnimation = Animated.sequence([
                Animated.timing(lockRotate, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(lockRotate, {
                    toValue: -1,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(lockRotate, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.delay(2000),
            ]);

            Animated.loop(rotateAnimation).start();
        } else {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
            scale.setValue(0.95);
        }
    }, [visible]);

    if (!visible) return null;

    const rotate = lockRotate.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-10deg', '10deg'],
    });

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                style={styles.overlay}
                onPress={onClose}
            >
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity,
                            transform: [{ scale }],
                        },
                    ]}
                >
                    {/* Mock Spotlight Effect (Gradient Background) */}
                    <View style={styles.header}>
                        <View style={styles.spotlight} />
                        <Animated.View style={[styles.iconContainer, { transform: [{ rotate }] }]}>
                            <Ionicons name="lock-closed" size={40} color="#22D3EE" />
                        </Animated.View>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>COMING SOON</Text>
                        <Text style={styles.message}>
                            "The greatest debates are worth the wait."
                        </Text>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
    },
    modalContainer: {
        width: Math.min(width - 40, 360),
        backgroundColor: '#0F1621',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
        overflow: 'hidden',
        shadowColor: '#06B6D4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F1621',
        position: 'relative',
        overflow: 'hidden',
    },
    spotlight: {
        position: 'absolute',
        top: -50,
        width: 200,
        height: 200,
        backgroundColor: 'rgba(34, 211, 238, 0.15)',
        borderRadius: 100,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    content: {
        padding: 24,
        paddingTop: 8,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: 'transparent', // Hack for gradient text if needed, strictly fallback to white/cyan
        marginBottom: 12,
        letterSpacing: 2,
        // Note: react-native doesn't support linear-gradient text natively without a library like expo-linear-gradient and MaskedView.
        // We'll stick to a solid Cyan color for simplicity unless requested.
        color: '#22D3EE',
    },
    message: {
        fontSize: 16,
        color: '#D1D5DB',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
    },
    buttonText: {
        color: '#E5E7EB',
        fontSize: 16,
        fontWeight: '600',
    },
});

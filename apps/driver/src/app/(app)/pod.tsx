import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Alert, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useDriverStore } from '../../lib/driver-store';
import type { LREntry } from '@fleetos/shared';

type SimpleLR = Pick<LREntry, 'id' | 'lr_number' | 'consignee_id'> & {
  consignee: { name: string } | null;
};

export default function PODScreen() {
  const { t } = useTranslation();
  const trip = useDriverStore((s) => s.currentTrip);
  const driver = useDriverStore((s) => s.driver);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lrs, setLrs] = useState<SimpleLR[]>([]);
  const [selectedLR, setSelectedLR] = useState<string | null>(null);

  useEffect(() => {
    if (!trip) return;
    (async () => {
      const { data } = await supabase
        .from('lr_entries')
        .select('id, lr_number, consignee_id, consignee:consignee_id(name)')
        .eq('trip_id', trip.id);
      if (data && data.length > 0) {
        setLrs(data as unknown as SimpleLR[]);
        setSelectedLR(data[0].id);
      }
    })();
  }, [trip]);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (result?.uri) setPhoto(result.uri);
  };

  const uploadPOD = async () => {
    if (!photo || !selectedLR || !trip || !driver) return;
    setUploading(true);

    // Compress image
    const compressed = await ImageManipulator.manipulateAsync(
      photo,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileName = `${trip.company_id}/${trip.id}/${Date.now()}.jpg`;

    // Read file as blob
    const response = await fetch(compressed.uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('pod-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      Alert.alert(t('common.error'), uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('pod-photos')
      .getPublicUrl(fileName);

    await supabase
      .from('lr_entries')
      .update({
        pod_photo_url: urlData.publicUrl,
        pod_uploaded_at: new Date().toISOString(),
        status: 'pod_uploaded',
      })
      .eq('id', selectedLR);

    setSuccess(true);
    setUploading(false);

    setTimeout(() => {
      setSuccess(false);
      setPhoto(null);
    }, 3000);
  };

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color="#1A3C6E" />;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={48} color="#64748B" />
        <Text style={styles.permText}>Camera permission needed</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>{t('home.no_trip')}</Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
        <Text style={styles.successText}>{t('pod.success')}</Text>
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} resizeMode="contain" />

        {/* LR selector */}
        {lrs.length > 1 && (
          <ScrollView horizontal style={styles.lrSelector} contentContainerStyle={{ gap: 8, padding: 8 }}>
            {lrs.map((lr) => (
              <TouchableOpacity
                key={lr.id}
                onPress={() => setSelectedLR(lr.id)}
                style={[styles.lrChip, selectedLR === lr.id && styles.lrChipActive]}
              >
                <Text style={[styles.lrChipText, selectedLR === lr.id && styles.lrChipTextActive]}>
                  {lr.lr_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setPhoto(null)}
          >
            <Ionicons name="refresh" size={24} color="#64748B" />
            <Text style={styles.retakeText}>{t('pod.retake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, uploading && { opacity: 0.5 }]}
            onPress={uploadPOD}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="#FFF" />
                <Text style={styles.confirmText}>{t('pod.confirm')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 24 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40,
  },
  captureButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  captureInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F97316',
  },
  preview: { flex: 1 },
  lrSelector: { position: 'absolute', top: 60, left: 0, right: 0 },
  lrChip: {
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  lrChipActive: { backgroundColor: '#F97316' },
  lrChipText: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  lrChipTextActive: { color: '#FFF' },
  actionRow: {
    flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#1E293B',
  },
  retakeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: '#374151',
  },
  retakeText: { fontSize: 16, color: '#D1D5DB', fontWeight: '600' },
  confirmButton: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: '#16A34A',
  },
  confirmText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
  successText: { fontSize: 20, fontWeight: '700', color: '#16A34A', marginTop: 16 },
  permText: { fontSize: 16, color: '#64748B', marginTop: 12, textAlign: 'center' },
  permButton: {
    marginTop: 16, backgroundColor: '#F97316', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  permButtonText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
});
